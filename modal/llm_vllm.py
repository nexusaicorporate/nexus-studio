# Nexus AI Studio — LLM backend on Modal (vLLM, OpenAI-compatible)
#
# Spins up on demand (cold-starts when the app first connects/sends a request),
# serves your HF model with vLLM, then scales to zero after an idle window.
# Model weights are cached in a persistent Modal Volume, so cold starts only load
# from storage (no re-download).
#
# Powers Chat, Bulk Analyze, all "Enhance"/"Surprise"/JSON-enhance, Character X-Ray.
# vLLM exposes /v1/chat/completions + /v1/models — register in the app as a CUSTOM
# (OpenAI-compatible) provider:
#     baseUrl = https://<you>--nexus-llm-serve.modal.run/v1
#     apiKey  = <your NEXUS_SECRET>     (vLLM enforces it via --api-key)
#
# Uncensored: a self-hosted vLLM server has NO content filter — refusals come only
# from the model weights, so pick an uncensored/abliterated model below.
#
# Setup:
#   pip install modal && modal setup
#   modal secret create nexus-secret NEXUS_SECRET=choose-a-long-secret HF_TOKEN=hf_xxx
#   modal run   modal/llm_vllm.py::download     # one-time: pre-cache weights into the Volume
#   modal deploy modal/llm_vllm.py              # deploy the on-demand server
import os
import subprocess
import modal

# ── model + hardware come from env so the Settings "Deploy" button can set them
#    at `modal deploy` time (falling back to these defaults if run by hand). The
#    chosen model is baked into the image env below so the container sees it. ──
LLM_MODEL = os.environ.get("LLM_MODEL", "TheBloke/dolphin-2.6-mistral-7B-AWQ")
PORT = 8000
GPU = os.environ.get("NEXUS_GPU", "A10G")
GPU_COUNT = int(os.environ.get("NEXUS_GPU_COUNT", "1"))   # >1 = tensor-parallel
CPU = float(os.environ.get("NEXUS_CPU", "8"))
RAM_MB = int(os.environ["NEXUS_RAM_MB"]) if os.environ.get("NEXUS_RAM_MB") else None
MAX_LEN = int(os.environ.get("NEXUS_MAX_LEN", "8192"))
CACHE_DIR = "/cache"
GPU_SPEC = f"{GPU}:{GPU_COUNT}" if GPU_COUNT > 1 else GPU

app = modal.App("nexus-llm")

# Persistent weight cache — survives across cold starts / deploys.
cache_vol = modal.Volume.from_name("nexus-llm-cache", create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("vllm==0.6.6", "huggingface_hub[hf_transfer]")
    .env({
        "HF_HUB_ENABLE_HF_TRANSFER": "1",
        "HF_HOME": CACHE_DIR,                 # HF + vLLM read/write weights here (the Volume)
        "VLLM_USE_V1": "0",
        "LLM_MODEL": LLM_MODEL,               # bake the chosen model into the container
    })
)


# One-time (or after changing LLM_MODEL): download weights into the Volume.
#   modal run modal/llm_vllm.py::download
@app.function(image=image, volumes={CACHE_DIR: cache_vol}, timeout=3600,
              secrets=[modal.Secret.from_name("nexus-secret")])
def download():
    from huggingface_hub import snapshot_download
    model = os.environ.get("LLM_MODEL", LLM_MODEL)
    print(f"Caching {model} into the Volume…")
    snapshot_download(model, token=os.environ.get("HF_TOKEN") or None)
    cache_vol.commit()
    print("Done — weights cached.")


@app.function(
    image=image,
    gpu=GPU_SPEC,                     # e.g. "L40S" or "T4:2" for tensor-parallel
    cpu=CPU,
    memory=RAM_MB,                    # MB request; None = Modal default
    volumes={CACHE_DIR: cache_vol},   # mount the cached weights
    timeout=3600,
    min_containers=0,                 # scale to zero → spins up when you connect
    scaledown_window=600,             # stay warm 10 min after the last request, then shut down
    secrets=[modal.Secret.from_name("nexus-secret")],
)
@modal.concurrent(max_inputs=32)      # vLLM continuous-batches many requests on one GPU
@modal.web_server(PORT, startup_timeout=900)
def serve():
    model = os.environ.get("LLM_MODEL", LLM_MODEL)
    key = os.environ["NEXUS_SECRET"]
    tp = f"--tensor-parallel-size {GPU_COUNT} " if GPU_COUNT > 1 else ""
    cmd = (
        f"vllm serve {model} "
        f"--host 0.0.0.0 --port {PORT} "
        f"--api-key {key} "
        f"--served-model-name {model} "
        f"--download-dir {CACHE_DIR} "
        f"--max-model-len {MAX_LEN} "
        f"{tp}"
        f"--gpu-memory-utilization 0.92"
    )
    subprocess.Popen(cmd, shell=True)
