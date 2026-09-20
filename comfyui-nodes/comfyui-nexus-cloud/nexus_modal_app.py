# Nexus Cloud (Modal) — the app this custom node deploys.
#
# This file runs ON Modal, in a cloud GPU container. It is self-contained
# (no imports from the local node) so `modal deploy nexus_modal_app.py` and the
# SDK deploy path both work. It:
#   - builds a ComfyUI image (comfy-cli, persistent models Volume),
#   - serves the unified Nexus server (`nexus_server.py`, baked into the image)
#     as a Modal web server on :8188 — that server reverse-proxies ComfyUI on an
#     internal port and serves the studio contracts (chat/image/video),
#   - offers volume-side model download/list helpers.
#
# Overridable env (set by adapters/modal.py before exec_module):
#   NEXUS_VOLUME, NEXUS_GPU, NEXUS_CPU, NEXUS_RAM_MB, NEXUS_COMFY_PORT,
#   NEXUS_SECRET, NEXUS_LLM_MODEL, NEXUS_IMAGE_MODEL, NEXUS_VIDEO_MODEL, HF_TOKEN
import base64
import os
import subprocess
from pathlib import Path

import modal

VOLUME_NAME = os.environ.get("NEXUS_VOLUME", "nexus-models")
GPU = os.environ.get("NEXUS_GPU", "a10g")
RAM_MB = int(os.environ.get("NEXUS_RAM_MB", "16384"))
CPU = int(os.environ.get("NEXUS_CPU", "4"))
PORT = int(os.environ.get("NEXUS_COMFY_PORT", "8188"))
COMFY_INTERNAL = int(os.environ.get("NEXUS_COMFY_INTERNAL", "8189"))

VOLUME_PATH = "/root/models"
OUTPUT_PATH = "/root/outputs"
OUTPUT_VOLUME_NAME = os.environ.get("NEXUS_OUTPUT_VOLUME", VOLUME_NAME + "-outputs")

ENV = {
    "NEXUS_SECRET": os.environ.get("NEXUS_SECRET", ""),
    "NEXUS_PUBLIC_PORT": str(PORT),
    "NEXUS_COMFY_PORT": str(COMFY_INTERNAL),
    "NEXUS_COMFY_HOME": "/root/comfy/ComfyUI",
    "NEXUS_MODELS_DIR": VOLUME_PATH,
    "NEXUS_OUTPUT_DIR": OUTPUT_PATH,
    "NEXUS_GPU": GPU,
    "NEXUS_LLM_MODEL": os.environ.get("NEXUS_LLM_MODEL", ""),
    "NEXUS_IMAGE_MODEL": os.environ.get("NEXUS_IMAGE_MODEL", ""),
    "NEXUS_VIDEO_MODEL": os.environ.get("NEXUS_VIDEO_MODEL", ""),
    "HF_HOME": VOLUME_PATH + "/.hf",
    "HF_TOKEN": os.environ.get("HF_TOKEN", ""),
}

_SERVER_SRC = base64.b64encode(
    (Path(__file__).resolve().parent / "nexus_server.py").read_bytes()
).decode()

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "libgl1", "libglib2.0-0", "libsm6", "libxrender1",
                 "libxext6", "ffmpeg")
    .pip_install("comfy-cli==1.3.7")
    .run_commands(
        "comfy --skip-prompt install --nvidia",
        gpu=GPU,
    )
    # Symlink the persistent Volume into ComfyUI's models dir each boot.
    .run_commands(
        f"mkdir -p {VOLUME_PATH} && rm -rf /root/comfy/ComfyUI/models && "
        f"ln -s {VOLUME_PATH} /root/comfy/ComfyUI/models",
        gpu=GPU,
    )
    .run_commands(
        "comfy node install https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git || true",
        "comfy node install https://github.com/kijai/ComfyUI-KJNodes.git || true",
        "comfy node install https://github.com/Lightricks/ComfyUI-LTXVideo.git || true",
        gpu=GPU,
    )
    .pip_install(
        "httpx>=0.27.0",
        "fastapi", "uvicorn",
        "diffusers", "transformers", "accelerate", "safetensors",
        "sentencepiece", "imageio", "imageio-ffmpeg", "pillow",
        "huggingface_hub[hf_transfer]",
    )
    # Bake the unified Nexus server into the image so it can be the entrypoint.
    .run_commands(
        f"echo {_SERVER_SRC} | base64 -d > /root/nexus_server.py && "
        "python -m py_compile /root/nexus_server.py",
    )
    .env(ENV)
)

app = modal.App("nexus-cloud-comfy", image=image)
vol = modal.Volume.from_name(VOLUME_NAME, create_if_missing=True)
out_vol = modal.Volume.from_name(OUTPUT_VOLUME_NAME, create_if_missing=True)


@app.function(
    gpu=GPU,
    cpu=CPU,
    memory=RAM_MB,
    timeout=3600,
    min_containers=0,
    scaledown_window=60,
    volumes={VOLUME_PATH: vol, OUTPUT_PATH: out_vol},
)
@modal.web_server(PORT, startup_timeout=300)
def ui():
    subprocess.Popen(
        f"python /root/nexus_server.py",
        shell=True,
    )


@app.function(
    image=modal.Image.debian_slim(python_version="3.11").pip_install("httpx>=0.27.0"),
    cpu=2,
    memory=512,
    timeout=1800,
    volumes={VOLUME_PATH: vol},
)
def download_model_to_volume(url: str, filename: str, save_path: str = "checkpoints",
                             hf_token: str = ""):
    import httpx
    import sys

    dest = Path(VOLUME_PATH) / save_path / filename
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        return {"status": "ok", "skipped": True, "path": str(dest)}

    headers = {}
    if hf_token and "huggingface.co" in url:
        headers["Authorization"] = f"Bearer {hf_token}"

    with httpx.stream("GET", url, headers=headers, follow_redirects=True,
                      timeout=1800) as r:
        r.raise_for_status()
        total = int(r.headers.get("content-length", 0))
        downloaded = 0
        with open(dest, "wb") as f:
            for chunk in r.iter_bytes(chunk_size=1048576):
                f.write(chunk)
                downloaded += len(chunk)
                if total:
                    sys.stdout.write(
                        f"\r  {downloaded / total * 100:.1f}% "
                        f"({downloaded // 1024**2} MB / {total // 1024**2} MB)"
                    )
                    sys.stdout.flush()
    vol.commit()
    return {"status": "ok", "path": str(dest)}


@app.function(
    image=modal.Image.debian_slim(python_version="3.11"),
    cpu=1,
    memory=512,
    timeout=60,
    volumes={VOLUME_PATH: vol},
)
def get_volume_status() -> dict:
    models = []
    scans = [("checkpoints", ["checkpoints", "diffusion_models", "unet"]),
             ("loras", ["loras"]), ("vae", ["vae"]),
             ("controlnet", ["controlnet"]), ("upscale_models", ["upscale_models"]),
             ("embeddings", ["embeddings"]), ("clip", ["clip"]),
             ("text_encoders", ["text_encoders"]),
             ("clip_vision", ["clip_vision"])]
    for section, folders in scans:
        for folder in folders:
            folder_path = Path(VOLUME_PATH) / folder
            if not folder_path.is_dir():
                continue
            files = []
            for fname in sorted(folder_path.iterdir()):
                if fname.is_file() and not fname.name.startswith("."):
                    files.append({"name": fname.name,
                                  "size": fname.stat().st_size,
                                  "folder": folder})
            models.extend(files)
    return {"models": models}