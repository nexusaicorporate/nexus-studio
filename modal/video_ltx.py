# Nexus AI Studio — Video backend on Modal (diffusers, async)
#
# Powers the Video Studio (and later Cinema). Video renders are long, so this is
# an async job API: submit -> job_id -> poll -> url.
# Register in the app as a MODAL backend (Settings → Managed / Modal Backend) with:
#     baseUrl = https://<your>--nexus-video-web.modal.run
#     secret  = <your NEXUS_SECRET>
#
# Contract (what the app calls):
#     POST {baseUrl}/generate/video
#       headers: Authorization: Bearer <secret>
#       body: { prompt, mode(t2v|i2v), image?(data-url), frames?, fps?, seed? }
#       -> { "job_id": "<id>" }
#     GET  {baseUrl}/jobs/{job_id}  -> { status: queued|running|done|error, progress?, url?, error? }
#     GET  {baseUrl}/video/{name}   -> the mp4 (referenced by the url above)
#
# LTX-Video is the lightest/fastest dev choice. Swap MODEL + the pipeline in
# render() for Wan2.1 / CogVideoX as needed (their diffusers APIs differ).
#
# Setup:
#   modal secret create nexus-secret NEXUS_SECRET=... HF_TOKEN=hf_xxx   (once)
#   modal deploy modal/video_ltx.py
import os
import modal

# ── model + hardware come from env so the Settings "Deploy" button can set them
#    at `modal deploy` time (defaults apply if run by hand). The chosen model is
#    baked into the image env so the container sees it. ──
VIDEO_MODEL = os.environ.get("VIDEO_MODEL", "Lightricks/LTX-Video")
GPU = os.environ.get("NEXUS_GPU", "A100")    # video needs a big GPU
CPU = float(os.environ.get("NEXUS_CPU", "8"))
RAM_MB = int(os.environ["NEXUS_RAM_MB"]) if os.environ.get("NEXUS_RAM_MB") else None

app = modal.App("nexus-video")
vol = modal.Volume.from_name("nexus-video-outputs", create_if_missing=True)
OUT = "/outputs"

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg")
    .pip_install(
        "torch==2.4.0",
        "diffusers==0.31.0",
        "transformers==4.46.0",
        "accelerate",
        "safetensors",
        "sentencepiece",
        "imageio",
        "imageio-ffmpeg",
        "pillow",
        "fastapi[standard]",
        "huggingface_hub[hf_transfer]",
    )
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1", "VIDEO_MODEL": VIDEO_MODEL})
)


# ── the actual render runs as its own Modal function so it can be spawned async ──
@app.function(image=image, gpu=GPU, cpu=CPU, memory=RAM_MB, timeout=1800, volumes={OUT: vol},
              secrets=[modal.Secret.from_name("nexus-secret")])
def render(body: dict) -> str:
    import base64
    import io
    import uuid
    import torch
    from diffusers import LTXPipeline, LTXImageToVideoPipeline
    from diffusers.utils import export_to_video
    from PIL import Image as PILImage

    model = os.environ.get("VIDEO_MODEL", VIDEO_MODEL)
    prompt = body.get("prompt", "")
    frames = int(body.get("frames", 97))
    fps = int(body.get("fps", 24))
    seed = body.get("seed")
    generator = torch.Generator("cuda").manual_seed(int(seed)) if seed is not None else None

    ref = body.get("image")
    if body.get("mode") == "i2v" and ref:
        pipe = LTXImageToVideoPipeline.from_pretrained(model, torch_dtype=torch.bfloat16).to("cuda")
        init = PILImage.open(io.BytesIO(base64.b64decode(ref.split(",")[-1]))).convert("RGB")
        result = pipe(image=init, prompt=prompt, num_frames=frames, generator=generator)
    else:
        pipe = LTXPipeline.from_pretrained(model, torch_dtype=torch.bfloat16).to("cuda")
        result = pipe(prompt=prompt, num_frames=frames, generator=generator)

    name = f"{uuid.uuid4().hex}.mp4"
    export_to_video(result.frames[0], os.path.join(OUT, name), fps=fps)
    vol.commit()
    return name


@app.function(image=image, timeout=600, volumes={OUT: vol},
              secrets=[modal.Secret.from_name("nexus-secret")], min_containers=0)
@modal.concurrent(max_inputs=20)
@modal.asgi_app()
def web():
    import os as _os
    from fastapi import FastAPI, Request, HTTPException
    from fastapi.responses import FileResponse

    api = FastAPI()
    SECRET = _os.environ["NEXUS_SECRET"]

    def auth(request: Request):
        if request.headers.get("authorization") != f"Bearer {SECRET}":
            raise HTTPException(status_code=401, detail="unauthorized")

    @api.post("/generate/video")
    async def generate(request: Request):
        auth(request)
        body = await request.json()
        call = render.spawn(body)          # kick off the GPU render asynchronously
        return {"job_id": call.object_id}

    @api.get("/jobs/{job_id}")
    async def job(job_id: str, request: Request):
        auth(request)
        fc = modal.FunctionCall.from_id(job_id)
        try:
            name = fc.get(timeout=0)        # raises TimeoutError if still running
        except TimeoutError:
            return {"status": "running"}
        except Exception as e:              # noqa: BLE001 — surface render failures
            return {"status": "error", "error": str(e)}
        url = str(request.base_url) + "video/" + name
        return {"status": "done", "url": url}

    @api.get("/video/{name}")
    async def video(name: str):
        vol.reload()
        path = _os.path.join(OUT, name)
        if not _os.path.exists(path):
            raise HTTPException(status_code=404, detail="not found")
        return FileResponse(path, media_type="video/mp4")

    return api
