# Nexus Cloud — Modal adapter (family: sdk-deploy)
#
# Deploys a Modal App that serves a plain ComfyUI web server (nexus_modal_app.py)
# on a persistent Volume mounted at ComfyUI's models/ path, then talks to it
# over HTTP with comfy_http.ComfyHttpClient — the SAME protocol the Beam adapter
# uses, so the router treats both providers identically.
#
# Credentials: Modal token id (ak-…) + secret (as-…). They are applied per-process
# via env vars (NOT ~/.modal.toml) so one ComfyUI can hold many Modal accounts.
from __future__ import annotations

import importlib.util
import os
import pathlib
import secrets
import subprocess
import sys
import time
from typing import Any, Callable, Optional

from .base import (
    CredField, DeploySpec, Endpoint, GpuOption, ProviderAdapter, ProviderSpec, Status,
)
from ..comfy_http import ComfyHttpClient, ComfyHttpError

_NODE_DIR = pathlib.Path(__file__).resolve().parent.parent
_APP_PATH = _NODE_DIR / "nexus_modal_app.py"
_APP_NAME = "nexus-cloud-comfy"
_VOLUME_NAME = "nexus-models"
_COMFY_PORT = 8188

_GPUS = [
    GpuOption(id="t4",   label="T4 · 16 GB",     vram_gb=16,  usd_per_hr=0.40),
    GpuOption(id="a10g", label="A10G · 24 GB",   vram_gb=24,  usd_per_hr=1.10),
    GpuOption(id="l40s", label="L40S · 48 GB",   vram_gb=48,  usd_per_hr=1.95),
    GpuOption(id="a100", label="A100 · 80 GB",   vram_gb=80,  usd_per_hr=2.78),
]

SPEC = ProviderSpec(
    id="modal",
    label="Modal",
    family="sdk-deploy",
    implemented=True,
    cred_fields=[
        CredField("token_id", "Token ID (ak-…)", secret=True, placeholder="ak-…",
                  help="Modal account token from the Modal dashboard → Settings → API tokens"),
        CredField("token_secret", "Token Secret (as-…)", secret=True, placeholder="as-…",
                  help="Modal account secret paired with the token ID"),
    ],
    gpu_options=_GPUS,
    default_gpu="a10g",
    default_cpu=4,
    default_ram_gb=16384,
    default_volume_gb=100,
    docs_url="https://modal.com/docs",
    summary="Serverless GPU containers via Modal. Persistent Volume holds your models; "
            "ComfyUI runs as a Modal web server.",
)


def _load_app(
    gpu: str = "a10g", cpu: int = 4, memory_mb: int = 16384,
    volume_name: str = _VOLUME_NAME, port: int = _COMFY_PORT,
    env: Optional[dict[str, Any]] = None,
):
    """Import the deployed Modal app module with env overrides so one
    nexus_modal_app.py serves any account's profile."""
    os.environ["NEXUS_GPU"] = gpu
    os.environ["NEXUS_CPU"] = str(cpu)
    os.environ["NEXUS_RAM_MB"] = str(memory_mb)
    os.environ["NEXUS_VOLUME"] = volume_name
    os.environ["NEXUS_COMFY_PORT"] = str(port)
    if env:
        for k, v in env.items():
            if v is not None:
                os.environ[str(k)] = str(v)
    spec = importlib.util.spec_from_file_location("nexus_modal_app", _APP_PATH)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class ModalAdapter(ProviderAdapter):
    spec = SPEC

    def __init__(self, creds: dict[str, str]):
        super().__init__(creds)
        self._app_name = _APP_NAME
        self._endpoint: Endpoint | None = None
        self._spec: DeploySpec | None = None
        self._deploy_pid: str | None = None
        # One generated Bearer per account (persisted back into the encrypted
        # store by the router when first generated). Guards the deployed app.
        self._secret = (creds or {}).get("nexus_secret") or secrets.token_urlsafe(32)

    @property
    def secret(self) -> str:
        return self._secret

    # ---- credentials -----------------------------------------------------
    def connect(self) -> None:
        token_id = (self.creds.get("token_id") or "").strip()
        secret = (self.creds.get("token_secret") or "").strip()
        errors = []
        if not token_id:
            errors.append("Modal token ID is required (ak-…)")
        if not secret:
            errors.append("Modal token secret is required (as-…)")
        if token_id and not token_id.startswith("ak-"):
            errors.append("Token ID should start with ak-")
        if secret and not secret.startswith("as-"):
            errors.append("Token secret should start with as-")
        if errors:
            raise ValueError("; ".join(errors))
        if "modal" not in sys.modules:
            try:
                import modal  # noqa: F401
            except ImportError as e:
                raise RuntimeError(
                    "'modal' package is not installed in this ComfyUI's Python. "
                    "Run: pip install modal"
                ) from e
        # Per-process, per-account creds — one ComfyUI, many Modal accounts.
        os.environ["MODAL_TOKEN_ID"] = token_id
        os.environ["MODAL_TOKEN_SECRET"] = secret
        # The deployed app's Bearer guard (baked into the image env by
        # nexus_modal_app.py at deploy time).
        os.environ["NEXUS_SECRET"] = self._secret

    def _require_connected(self) -> None:
        if not os.environ.get("MODAL_TOKEN_ID") or not os.environ.get("MODAL_TOKEN_SECRET"):
            raise RuntimeError("Not authenticated. Connect a Modal account first.")

    # ---- deploy ----------------------------------------------------------
    def _web_url(self) -> str:
        """Best-effort read of the deployed app's web URL via the Modal SDK."""
        import modal
        fn = modal.Function.from_name(self._app_name, "ui")
        return getattr(fn, "web_url", "") or ""

    def _deploy_sdk(self, app) -> bool:
        try:
            from modal.runner import deploy_app  # noqa: F401
        except Exception:
            return False
        try:
            dep = app.deploy(name=self._app_name)
            # Recent modal SDKs return a DeploymentInfo with .web_url
            url = getattr(dep, "web_url", "") or ""
            if not url:
                import modal
                fn = modal.Function.from_name(self._app_name, "ui")
                url = getattr(fn, "web_url", "") or ""
            self._endpoint = Endpoint(base_url=str(url).rstrip("/"),
                                      secret=self._secret, kind="model-api",
                                      meta={"provider": "modal", "app": self._app_name})
            return bool(url)
        except Exception as e:
            print(f"[nexus-cloud] modal SDK deploy failed: {e}")
            return False

    def _deploy_cli(self) -> None:
        modal_cmd = None
        os_env = dict(os.environ)
        python_dir = os.path.dirname(sys.executable)
        for cand in (os.path.join(python_dir, "modal"), os.path.join(python_dir, "Scripts", "modal")):
            if os.path.isfile(cand):
                modal_cmd = cand
                break
        if not modal_cmd:
            import shutil
            modal_cmd = shutil.which("modal")
        if not modal_cmd:
            raise RuntimeError("modal CLI not found. Run: pip install modal")
        result = subprocess.run(
            [modal_cmd, "deploy", str(_APP_PATH)],
            capture_output=True, text=True, encoding="utf-8", errors="replace",
            timeout=900, env=os_env,
        )
        combined = (result.stdout or "") + "\n" + (result.stderr or "")
        if result.returncode != 0:
            if "token" in combined.lower() or "auth" in combined.lower() or "credentials" in combined.lower():
                raise RuntimeError("Modal token not accepted. Check Token ID / Secret.")
            raise RuntimeError(f"modal deploy failed: {combined[-1200:]}")
        url = self._web_url()
        self._endpoint = Endpoint(base_url=url.rstrip("/"),
                                  secret=self._secret, kind="model-api",
                                  meta={"provider": "modal", "app": self._app_name})

    def provision(self, spec: DeploySpec) -> Endpoint:
        self._require_connected()
        self._spec = spec
        ram_mb = max(spec.ram_gb, 1024) if isinstance(spec.ram_gb, int) and spec.ram_gb > 120 else spec.ram_gb

        # Reuse an already-running endpoint with the same profile.
        meta = self._endpoint.meta if self._endpoint else {}
        if self._endpoint and meta.get("gpu") == spec.gpu_model:
            return self._endpoint

        import modal  # noqa: F401
        mod = _load_app(gpu=spec.gpu_model, cpu=spec.cpu,
                        memory_mb=ram_mb, volume_name=spec.volume_name,
                        env=spec.env)
        app = mod.app

        if not self._deploy_sdk(app):
            self._deploy_cli()
        if not self._endpoint or not self._endpoint.base_url:
            raise RuntimeError("Modal deploy succeeded but no web URL could be read. "
                               "Check the deploy from the Modal dashboard.")
        self._endpoint.meta["gpu"] = spec.gpu_model
        self._endpoint.meta["volume"] = spec.volume_name
        self._endpoint.meta["deployed_at"] = time.time()
        return self._endpoint

    # ---- runtime ---------------------------------------------------------
    def run(self, workflow: dict[str, Any],
            input_images: dict[str, str] | None = None) -> dict[str, Any]:
        if not self._endpoint or not self._endpoint.base_url:
            raise RuntimeError("Not deployed. Provision a Modal account first.")
        client = ComfyHttpClient(self._endpoint.base_url, secret=self._endpoint.secret)
        pid = client.submit(workflow, input_images or {})
        return client.collect(pid)

    def status(self) -> Status:
        if not self._endpoint or not self._endpoint.base_url:
            return Status(running=False, gpu=(self._spec.gpu_model if self._spec else ""),
                          message="not deployed")
        try:
            client = ComfyHttpClient(self._endpoint.base_url, secret=self._endpoint.secret,
                                     max_attempts=3)
            client._open("GET", "/system_stats", None, None)
            return Status(running=True, gpu=self._endpoint.meta.get("gpu", ""),
                          message="running", est_cost_usd=self._estimate_cost())
        except Exception as e:
            return Status(running=False, gpu=self._endpoint.meta.get("gpu", ""),
                          message=f"unreachable: {e}")

    def download_model(self, url: str, folder: str,
                       on_progress: Optional[Callable[[float], None]] = None) -> None:
        if not self._endpoint or not self._endpoint.base_url:
            raise RuntimeError("Not deployed. Provision a Modal account first.")
        # Preferred: the Modal function writes straight to the Volume (progress
        # + no web-server timeout). Fallback: the running ComfyUI's
        # /workflow-models/download route.
        try:
            import modal
            fn = modal.Function.from_name(self._app_name, "download_model_to_volume")
            fn.remote(url, os.path.basename(url), folder)
            return
        except Exception as e:
            print(f"[nexus-cloud] Modal function download failed, using HTTP route: {e}")
        client = ComfyHttpClient(self._endpoint.base_url, secret=self._endpoint.secret,
                                 timeout=1200)
        client._json("POST", "/workflow-models/download", {"url": url, "folder": folder})

    def stop(self) -> None:
        """Modal web servers scale to zero on their own; nothing to stop."""
        self._endpoint = None

    def teardown(self) -> None:
        """Remove the deployed Modal app (volume kept)."""
        try:
            import modal
            modal.app.App.delete(self._app_name)
        except Exception as e:
            print(f"[nexus-cloud] could not delete Modal app: {e}")
        self._endpoint = None

    def _estimate_cost(self) -> Optional[float]:
        for g in _GPUS:
            if g.id == self._endpoint.meta.get("gpu"):
                return g.usd_per_hr
        return None