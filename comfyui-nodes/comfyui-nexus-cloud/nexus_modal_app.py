# Nexus Cloud — Modal app deployed by the Modal adapter
#
# Defines the actual Modal App: an image with ComfyUI + a persistent Volume
# mounted at the models path, served over HTTP. The adapter deploys this with
# the SDK; ComfyUI's /prompt is proxied here so graphs run on the Modal GPU.
#
# GPU / volume are read from env so one module serves every hardware profile
# the sidebar offers (NEXUS_GPU, NEXUS_GPU_COUNT, NEXUS_VOLUME).
#
# This file is deployed to Modal — it is NOT imported by ComfyUI at runtime
# except to read `app` / `comfy_web` for the web URL.
import os
import subprocess

import modal

GPU = os.environ.get("NEXUS_GPU", "L40S")
GPU_COUNT = int(os.environ.get("NEXUS_GPU_COUNT", "1"))
VOLUME = os.environ.get("NEXUS_VOLUME", "nexus-models")
PORT = 8188
MODELS_DIR = "/root/comfy/ComfyUI/models"

app = modal.App("nexus-cloud-comfy")

# Persistent model store — survives across cold starts / deploys.
models_vol = modal.Volume.from_name(VOLUME, create_if_missing=True)

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "libgl1", "libglib2.0-0")
    .pip_install("comfy-cli", "huggingface_hub[hf_transfer]")
    .run_commands(
        "comfy --skip-prompt install --nvidia",
        # the model auto-downloader node, so /workflow-models works on the server
        "comfy node install ComfyUI-Workflow-Models-Downloader || true",
    )
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1"})
)


@app.function(
    image=image,
    gpu=f"{GPU}:{GPU_COUNT}" if GPU_COUNT > 1 else GPU,
    volumes={MODELS_DIR: models_vol},
    timeout=3600,
    min_containers=0,        # scale to zero between sessions
    scaledown_window=300,    # stay warm 5 min after last request
)
@modal.concurrent(max_inputs=4)
@modal.web_server(PORT, startup_timeout=900)
def comfy_web():
    # Launch ComfyUI listening on all interfaces; the mounted Volume holds models.
    subprocess.Popen(
        f"comfy launch -- --listen 0.0.0.0 --port {PORT}",
        shell=True,
    )
