# Nexus AI Studio — Video backend on Modal (diffusers, async)
#
# Powers the Video Studio (and Cinema). Video renders are long, so this is
# an async job API: submit -> job_id -> poll -> url.
# Register in the app as a MODAL backend (Settings → Managed / Modal Backend) with:
#     baseUrl = https://<your>--nexus-video-web.modal.run
#     secret  = <your NEXUS_SECRET>
#
# Contract (what the app calls):
#     POST {baseUrl}/generate/video
#       headers: Authorization: Bearer <secret>
#       body: { prompt, mode(t2v|i2v|v2v), image?(data-url), end_image?(data-url), quantize?, audio?, frames?, fps?, seed? }
#       -> { "job_id": "<id>" }
#     GET  {baseUrl}/jobs/{job_id}  -> { status: queued|running|done|error, progress?, url?, error? }
#     GET  {baseUrl}/video/{name}   -> the mp4 (referenced by the url above)
#
# LTX-Video is the lightest/fastest dev choice.
#
# Setup:
#   modal secret create nexus-secret NEXUS_SECRET=... HF_TOKEN=hf_xxx   (once)
#   modal deploy modal/video_ltx.py
import os
import modal

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
        "diffusers>=0.32.0,<0.33.0",
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


@app.cls(
    image=image,
    gpu=GPU,
    cpu=CPU,
    memory=RAM_MB,
    timeout=1800,
    volumes={OUT: vol},
    secrets=[modal.Secret.from_name("nexus-secret")],
)
class VideoModel:
    @modal.enter()
    def load_model(self):
        import torch
        self.torch = torch
        self.pipe = None
        self.last_config = None
        
        # Point Torch Inductor cache to our persistent volume to preserve compiled kernels across runs
        os.environ["TORCHINDUCTOR_CACHE_DIR"] = os.path.join(OUT, ".inductor_cache")

    def purge_caches(self):
        if hasattr(self, "torch") and self.torch.cuda.is_available():
            self.torch.cuda.empty_cache()
            self.torch.cuda.ipc_collect()

    def prepare_custom_latents(self, vae, start_img, end_img, frames, width, height, generator, device, dtype):
        import torch
        import numpy as np
        from PIL import Image as PILImage
        
        latent_h = height // 32
        latent_w = width // 32
        latent_frames = (frames - 1) // 8 + 1
        num_channels = vae.config.latent_channels
        
        # Generate initial noise
        noise = torch.randn(
            (1, num_channels, latent_frames, latent_h, latent_w),
            device=device,
            dtype=dtype,
            generator=generator
        )
        
        def encode(img_pil):
            # Resize image to match latent dims spatially
            img_resized = img_pil.resize((width, height), PILImage.Resampling.LANCZOS)
            img_arr = np.array(img_resized).astype(np.float32) / 127.5 - 1.0
            img_tensor = torch.from_numpy(img_arr).permute(2, 0, 1).unsqueeze(0).to(device=device, dtype=dtype)
            with torch.no_grad():
                lat = vae.encode(img_tensor).latent_dist.sample(generator=generator)
                lat = lat * vae.config.scaling_factor
            return lat # Shape [1, num_channels, 1, latent_h, latent_w]
            
        start_latent = encode(start_img) if start_img else None
        end_latent = encode(end_img) if end_img else None
        
        if start_latent is not None and end_latent is not None:
            # Double keyframe conditioning (start + end frame interpolation)
            for i in range(latent_frames):
                weight = i / (latent_frames - 1)
                blended = (1 - weight) * start_latent + weight * end_latent
                # Parabolic noise weight (lower near keyframes, higher in the middle)
                noise_weight = 1.0 - (4.0 * weight * (1.0 - weight))
                noise_weight = max(0.1, noise_weight)
                noise[:, :, i] = blended * (1.0 - noise_weight) + noise[:, :, i] * noise_weight
        elif start_latent is not None:
            # Single keyframe conditioning (Image-to-Video)
            for i in range(latent_frames):
                cond_weight = 0.85 ** i
                noise[:, :, i] = start_latent * cond_weight + noise[:, :, i] * (1.0 - cond_weight)
        elif end_latent is not None:
            # Single keyframe conditioning (reverse)
            for i in range(latent_frames):
                cond_weight = 0.85 ** (latent_frames - 1 - i)
                noise[:, :, i] = end_latent * cond_weight + noise[:, :, i] * (1.0 - cond_weight)
                
        return noise

    @modal.method()
    def render(self, body: dict) -> str:
        import base64
        import io
        import uuid
        import os
        import subprocess
        from PIL import Image as PILImage
        from diffusers.utils import export_to_video
        from diffusers import LTXPipeline

        model = os.environ.get("VIDEO_MODEL", VIDEO_MODEL)
        prompt = body.get("prompt", "")
        frames = int(body.get("frames", 97))
        fps = int(body.get("fps", 24))
        seed = body.get("seed")
        generator = self.torch.Generator("cuda").manual_seed(int(seed)) if seed is not None else None

        width = int(body.get("width", 768))
        height = int(body.get("height", 512))
        quantize = body.get("quantize", False)

        current_config = (width, height, frames, quantize)
        if self.last_config is not None and self.last_config != current_config:
            self.purge_caches()
            self.pipe = None
        self.last_config = current_config

        # ── Initialize the optimized LTX Pipeline ──
        if self.pipe is None:
            # Quantization support (use float8 transformer on compatible hardware if quantize=True)
            transformer_dtype = self.torch.float8_e4m3fn if (quantize and hasattr(self.torch, "float8_e4m3fn")) else self.torch.bfloat16
            
            self.pipe = LTXPipeline.from_pretrained(
                model, torch_dtype=self.torch.bfloat16
            )
            
            # Apply memory-efficient scaling & offloading if quantize / low VRAM is selected
            if quantize:
                self.pipe.enable_model_cpu_offload()
                self.pipe.enable_vae_slicing()
                self.pipe.enable_vae_tiling()
            else:
                self.pipe.to("cuda")
                self.pipe.transformer = self.torch.compile(self.pipe.transformer)

        # ── Prepare Keyframe Conditioning Latents ──
        ref_start = body.get("image")
        ref_end = body.get("end_image")
        
        start_img = PILImage.open(io.BytesIO(base64.b64decode(ref_start.split(",")[-1]))).convert("RGB") if ref_start else None
        end_img = PILImage.open(io.BytesIO(base64.b64decode(ref_end.split(",")[-1]))).convert("RGB") if ref_end else None
        
        custom_latents = self.prepare_custom_latents(
            self.pipe.vae, start_img, end_img, frames, width, height, generator, "cuda", self.torch.bfloat16
        )

        # ── Render Video ──
        result = self.pipe(
            prompt=prompt,
            width=width,
            height=height,
            num_frames=frames,
            latents=custom_latents,
            generator=generator
        )

        name = f"{uuid.uuid4().hex}.mp4"
        audio_data = body.get("audio")
        
        # ── Optional Audio track alignment via ffmpeg ──
        if audio_data:
            temp_audio_path = f"/tmp/{uuid.uuid4().hex}.mp3"
            with open(temp_audio_path, "wb") as f:
                f.write(base64.b64decode(audio_data.split(",")[-1]))
                
            silent_path = os.path.join(OUT, f"silent_{name}")
            export_to_video(result.frames[0], silent_path, fps=fps)
            
            final_path = os.path.join(OUT, name)
            cmd = f"ffmpeg -y -i {silent_path} -i {temp_audio_path} -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest {final_path}"
            subprocess.run(cmd, shell=True, check=True)
            
            os.remove(temp_audio_path)
            os.remove(silent_path)
        else:
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
    from fastapi.middleware.cors import CORSMiddleware

    api = FastAPI()
    api.add_middleware(
        CORSMiddleware, allow_origins=["*"], allow_credentials=False,
        allow_methods=["*"], allow_headers=["*"],
    )
    SECRET = _os.environ["NEXUS_SECRET"]

    def auth(request: Request):
        if request.headers.get("authorization") != f"Bearer {SECRET}":
            raise HTTPException(status_code=401, detail="unauthorized")

    @api.post("/generate/video")
    async def generate(request: Request):
        auth(request)
        body = await request.json()
        model_instance = VideoModel()
        call = model_instance.render.spawn(body)
        return {"job_id": call.object_id}

    @api.get("/jobs/{job_id}")
    async def job(job_id: str, request: Request):
        auth(request)
        fc = modal.FunctionCall.from_id(job_id)
        try:
            name = fc.get(timeout=0)
        except TimeoutError:
            return {"status": "running"}
        except Exception as e:
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
