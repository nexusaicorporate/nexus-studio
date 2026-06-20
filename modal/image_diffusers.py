# Nexus AI Studio — Image backend on Modal (diffusers)
#
# Powers the Image Studio (t2i + i2i) and Character previews.
# Register in the app as a MODAL backend (Settings → Managed / Modal Backend) with:
#     baseUrl = https://<your>--nexus-image-web.modal.run
#     secret  = <your NEXUS_SECRET>
#     models  = whatever you want to show in the dropdown (informational)
#
# Contract (what the app calls):
#     POST {baseUrl}/generate/image
#       headers: Authorization: Bearer <secret>
#       body: { prompt, width, height, seed?, image?(data-url for i2i), steps?, strength? }
#       -> { "image": "<base64 png>" }
#
# Uncensored: self-hosted, no provider ToS; the diffusers safety_checker is nulled
# below. Pick an NSFW-capable checkpoint. SDXL/Pony use the Auto pipelines as-is;
# for FLUX swap to FluxPipeline / FluxImg2ImgPipeline (noted inline).
#
# Setup:
#   modal secret create nexus-secret NEXUS_SECRET=... HF_TOKEN=hf_xxx   (once)
#   modal deploy modal/image_diffusers.py
import os
import modal

# ── model + hardware come from env so the Settings "Deploy" button can set them
#    at `modal deploy` time (defaults apply if run by hand). The chosen checkpoint
#    is baked into the image env so the container sees it. ──
IMAGE_MODEL = os.environ.get("IMAGE_MODEL", "stabilityai/stable-diffusion-xl-base-1.0")
GPU = os.environ.get("NEXUS_GPU", "A10G")
CPU = float(os.environ.get("NEXUS_CPU", "8"))
RAM_MB = int(os.environ["NEXUS_RAM_MB"]) if os.environ.get("NEXUS_RAM_MB") else None

app = modal.App("nexus-image")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install(
        "torch==2.4.0",
        "diffusers==0.31.0",
        "transformers==4.46.0",
        "accelerate",
        "safetensors",
        "sentencepiece",
        "pillow",
        "fastapi[standard]",
        "huggingface_hub[hf_transfer]",
    )
    .env({"HF_HUB_ENABLE_HF_TRANSFER": "1", "IMAGE_MODEL": IMAGE_MODEL})
)


@app.cls(
    image=image,
    gpu=GPU,
    cpu=CPU,
    memory=RAM_MB,           # MB request; None = Modal default
    timeout=600,
    min_containers=0,        # scale to zero → no idle billing (cold start reloads the checkpoint, ~30–60s)
    scaledown_window=300,    # stay warm 5 min after the last request, then shut down
    secrets=[modal.Secret.from_name("nexus-secret")],
)
@modal.concurrent(max_inputs=2)
class ImageModel:
    @modal.enter()
    def load(self):
        import torch
        from diffusers import AutoPipelineForText2Image, AutoPipelineForImage2Image

        model = os.environ.get("IMAGE_MODEL", IMAGE_MODEL)
        # FLUX note: replace the two lines below with
        #   from diffusers import FluxPipeline, FluxImg2ImgPipeline
        #   self.t2i = FluxPipeline.from_pretrained(model, torch_dtype=torch.bfloat16).to("cuda")
        self.t2i = AutoPipelineForText2Image.from_pretrained(
            model, torch_dtype=torch.float16, variant="fp16", use_safetensors=True
        ).to("cuda")
        # Disable the NSFW safety checker if the pipeline has one (SD1.5 family).
        if getattr(self.t2i, "safety_checker", None) is not None:
            self.t2i.safety_checker = None
        self.i2i = AutoPipelineForImage2Image.from_pipe(self.t2i)

    @modal.asgi_app()
    def web(self):
        import base64
        import io
        import torch
        from fastapi import FastAPI, Request, HTTPException
        from PIL import Image as PILImage

        api = FastAPI()
        SECRET = os.environ["NEXUS_SECRET"]

        @api.post("/generate/image")
        async def generate(request: Request):
            if request.headers.get("authorization") != f"Bearer {SECRET}":
                raise HTTPException(status_code=401, detail="unauthorized")
            body = await request.json()
            prompt = body.get("prompt", "")
            negative = body.get("negative_prompt") or body.get("negative")
            steps = int(body.get("steps", 30))
            seed = body.get("seed")
            generator = torch.Generator("cuda").manual_seed(int(seed)) if seed is not None else None

            ref = body.get("image")
            if ref:  # image-to-image
                raw = ref.split(",")[-1]
                init = PILImage.open(io.BytesIO(base64.b64decode(raw))).convert("RGB")
                result = self.i2i(
                    prompt=prompt, negative_prompt=negative, image=init,
                    strength=float(body.get("strength", 0.6)),
                    num_inference_steps=steps, generator=generator,
                )
            else:  # text-to-image
                result = self.t2i(
                    prompt=prompt, negative_prompt=negative,
                    width=int(body.get("width", 1024)), height=int(body.get("height", 1024)),
                    num_inference_steps=steps, generator=generator,
                )

            img = result.images[0]
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            return {"image": base64.b64encode(buf.getvalue()).decode()}

        @api.get("/health")
        async def health():
            return {"status": "ok", "model": os.environ.get("IMAGE_MODEL", IMAGE_MODEL)}

        return api
