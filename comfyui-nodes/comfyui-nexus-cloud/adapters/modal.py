# Nexus Cloud — Modal adapter (the working reference)
#
# SDK-deploy family. Uses the Modal Python SDK to deploy a served ComfyUI app
# with a persistent Volume mounted at models/, then routes /prompt to it.
#
# This is intentionally the most complete adapter — the others mirror its shape.
# It deploys the companion app module `nexus_modal_app.py` (sibling file) which
# defines the actual Modal app (image, GPU, volume, ComfyUI web server).
#
# Credentials: Modal Token ID (ak-…) + Token Secret (as-…), same as the canvas.
from __future__ import annotations

import os
import time
from typing import Any, Callable, Optional

from .base import (
    CredField,
    DeploySpec,
    Endpoint,
    GpuOption,
    ProviderAdapter,
    ProviderSpec,
    Status,
)

# Modal GPU catalogue (rough public hints; the UI shows these, billing is Modal's).
_GPUS = [
    GpuOption("T4", "T4 · 16 GB", 16, 0.40, "cheapest; small SD models"),
    GpuOption("A10G", "A10G · 24 GB", 24, 1.10, "good default for SDXL"),
    GpuOption("L40S", "L40S · 48 GB", 48, 1.95, "image/video/LoRA training"),
    GpuOption("A100", "A100 · 40 GB", 40, 2.78, "heavy video / large models"),
]

SPEC = ProviderSpec(
    id="modal",
    label="Modal",
    family="sdk-deploy",
    implemented=True,
    cred_fields=[
        CredField("token_id", "Token ID (ak-…)", secret=False,
                  placeholder="ak-…", help="modal.com → Settings → Tokens"),
        CredField("token_secret", "Token Secret (as-…)", secret=True,
                  placeholder="as-…"),
    ],
    gpu_options=_GPUS,
    default_gpu="L40S",
    default_cpu=8,
    default_ram_gb=48,
    default_volume_gb=200,
    persistent_storage=True,
    docs_url="https://modal.com/docs",
    summary="Serverless GPUs, per-second billing, scale-to-zero. 1 TiB Volume "
            "free tier so models download once and persist.",
)


class ModalAdapter(ProviderAdapter):
    spec = SPEC

    APP_NAME = "nexus-cloud-comfy"
    VOLUME_NAME = "nexus-models"

    def __init__(self, creds: dict[str, str]):
        super().__init__(creds)
        self._client = None
        self._endpoint: Optional[Endpoint] = None
        self._started_at: Optional[float] = None
        self._gpu = ""

    # ---- helpers ---------------------------------------------------------
    def _ensure_env(self) -> None:
        """Modal SDK reads tokens from env / ~/.modal.toml. We inject the
        sidebar-provided creds into the process env for this session."""
        tid = self.creds.get("token_id", "").strip()
        tsec = self.creds.get("token_secret", "").strip()
        if not tid or not tsec:
            raise RuntimeError("Modal Token ID and Secret are required.")
        os.environ["MODAL_TOKEN_ID"] = tid
        os.environ["MODAL_TOKEN_SECRET"] = tsec

    def _import_modal(self):
        try:
            import modal  # noqa: F401
            return modal
        except Exception as e:  # pragma: no cover - depends on bundled env
            raise RuntimeError(
                "The `modal` package isn't installed in this ComfyUI's Python. "
                "It ships with the Nexus install; reinstall or `pip install modal`."
            ) from e

    # ---- lifecycle -------------------------------------------------------
    def connect(self) -> None:
        self._ensure_env()
        modal = self._import_modal()
        # A cheap auth check: look up (or create) the persistent volume.
        modal.Volume.from_name(self.VOLUME_NAME, create_if_missing=True)

    def provision(self, spec: DeploySpec) -> Endpoint:
        self._ensure_env()
        modal = self._import_modal()
        self._gpu = spec.gpu_model

        # Deploy (or look up) the companion ComfyUI-on-Modal app. The app module
        # parameterises GPU/volume from env so we don't rewrite code per profile.
        os.environ["NEXUS_GPU"] = spec.gpu_model
        os.environ["NEXUS_GPU_COUNT"] = str(spec.gpu_count)
        os.environ["NEXUS_VOLUME"] = spec.volume_name or self.VOLUME_NAME

        try:
            # Prefer an already-deployed app's web URL if present.
            from nexus_modal_app import comfy_web  # type: ignore
            url = comfy_web.web_url  # deployed function URL
        except Exception:
            url = self._deploy_app(modal, spec)

        self._started_at = time.time()
        self._endpoint = Endpoint(
            base_url=url.rstrip("/"),
            secret=self.creds.get("token_secret", ""),
            kind="comfyui",
            meta={"gpu": spec.gpu_model, "provider": "modal"},
        )
        return self._endpoint

    def _deploy_app(self, modal, spec: DeploySpec) -> str:
        """Deploy the sibling app module to Modal and return its web URL.
        Uses `modal deploy` semantics via the SDK so it runs from inside
        ComfyUI's Python without a shell."""
        from pathlib import Path
        app_path = Path(__file__).parent.parent / "nexus_modal_app.py"
        if not app_path.exists():
            raise RuntimeError(
                "nexus_modal_app.py is missing from the node — cannot deploy."
            )
        # modal.runner.deploy_app loads the App object and deploys it.
        import importlib.util
        sys_spec = importlib.util.spec_from_file_location("nexus_modal_app", app_path)
        mod = importlib.util.module_from_spec(sys_spec)
        sys_spec.loader.exec_module(mod)  # type: ignore
        app = getattr(mod, "app")
        modal.runner.deploy_app(app, name=self.APP_NAME)
        # After deploy, resolve the web endpoint URL.
        web_fn = getattr(mod, "comfy_web")
        return web_fn.web_url

    def status(self) -> Status:
        if not self._endpoint:
            return Status(running=False, message="Not deployed.")
        uptime = int(time.time() - (self._started_at or time.time()))
        gpu_hint = next((g for g in _GPUS if g.id == self._gpu), None)
        est = round((gpu_hint.usd_per_hr or 0) * uptime / 3600, 4) if gpu_hint else None
        return Status(
            running=True,
            gpu=self._gpu,
            uptime_s=uptime,
            est_cost_usd=est,
            message=f"Modal endpoint live ({self._endpoint.base_url}).",
        )

    def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        if not self._endpoint:
            raise RuntimeError("Modal endpoint not provisioned. Connect & Deploy first.")
        import urllib.request
        import json
        data = json.dumps(payload).encode()
        req = urllib.request.Request(
            f"{self._endpoint.base_url}/prompt",
            data=data,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=600) as r:
            return json.loads(r.read().decode())

    def download_model(self, url: str, folder: str,
                       on_progress: Optional[Callable[[float], None]] = None) -> None:
        # On Modal the workflow-models-downloader runs *inside* the container and
        # writes to the mounted Volume, so the local node just forwards a request.
        if not self._endpoint:
            raise RuntimeError("Provision first.")
        import urllib.request
        import json
        body = json.dumps({"url": url, "folder": folder}).encode()
        req = urllib.request.Request(
            f"{self._endpoint.base_url}/workflow-models/download",
            data=body, headers={"Content-Type": "application/json"},
        )
        urllib.request.urlopen(req, timeout=3600).read()

    def stop(self) -> None:
        # Modal scales to zero on its own (min_containers=0). Nothing to do to
        # stop billing beyond letting the scaledown window elapse.
        self._endpoint = None
        self._started_at = None

    def teardown(self) -> None:
        self._ensure_env()
        modal = self._import_modal()
        try:
            modal.App.lookup(self.APP_NAME).stop()  # type: ignore[attr-defined]
        except Exception:
            pass
        self._endpoint = None
