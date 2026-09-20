# Nexus Cloud — Beam adapter (family: sdk-deploy)
#
# Deploys a Beam Pod serving plain ComfyUI (nexus_beam_app.py) on :8000, then
# talks to it over HTTP with comfy_http.ComfyHttpClient — the SAME protocol the
# Modal adapter uses, so the router treats both providers identically.
#
# Credentials: a Beam API token (BEAM_TOKEN). Optional workspace id. Per-process
# env vars, so many Beam accounts can exist on one ComfyUI.
from __future__ import annotations

import importlib.util
import os
import pathlib
import secrets
import sys
import time
from typing import Any, Callable, Optional

from .base import (
    CredField, DeploySpec, Endpoint, GpuOption, ProviderAdapter, ProviderSpec, Status,
)
from ..comfy_http import ComfyHttpClient

_NODE_DIR = pathlib.Path(__file__).resolve().parent.parent
_APP_PATH = _NODE_DIR / "nexus_beam_app.py"
_POD_NAME = "nexus-cloud-comfy"
_COMFY_PORT = 8000

_GPUS = [
    GpuOption(id="T4",       label="T4 · 16 GB",    vram_gb=16, usd_per_hr=0.40),
    GpuOption(id="A10G",     label="A10G · 24 GB",  vram_gb=24, usd_per_hr=0.95),
    GpuOption(id="RTX4090",  label="RTX 4090 · 24 GB", vram_gb=24, usd_per_hr=1.30),
    GpuOption(id="L40S",     label="L40S · 48 GB",  vram_gb=48, usd_per_hr=1.50),
    GpuOption(id="A100-80",  label="A100 · 80 GB",  vram_gb=80, usd_per_hr=2.10),
    GpuOption(id="H100",     label="H100 · 80 GB",  vram_gb=80, usd_per_hr=1.74),
    GpuOption(id="B200",     label="B200 · 192 GB", vram_gb=192, usd_per_hr=3.50),
]

SPEC = ProviderSpec(
    id="beam",
    label="Beam",
    family="sdk-deploy",
    implemented=True,
    cred_fields=[
        CredField("api_token", "API Token (BEAM_TOKEN)", secret=True,
                  placeholder="paste Beam token",
                  help="Beam account token from the Beam dashboard → Settings → API tokens"),
        CredField("workspace_id", "Workspace ID (optional)", secret=False,
                  placeholder="w-…",
                  help="Leave blank to use your default workspace"),
    ],
    gpu_options=_GPUS,
    default_gpu="L40S",
    default_cpu=8,
    default_ram_gb=48,
    default_volume_gb=150,
    docs_url="https://docs.beam.cloud",
    summary="Serverless GPU pods via Beam. Persistent Volume holds your models; "
            "ComfyUI runs in the pod and cold-starts in ~1-3 min.",
)


def _load_app(
    gpu: str = "L40S", cpu: int = 8, ram_gb: int = 48,
    volume_name: str = "beam-nexus-cloud-models", port: int = _COMFY_PORT,
    env: Optional[dict[str, Any]] = None,
):
    """Import the Beam Pod definition (nexus_beam_app.py) with env overrides."""
    os.environ["NEXUS_BEAM_GPU"] = gpu
    os.environ["NEXUS_BEAM_CPU"] = str(cpu)
    os.environ["NEXUS_BEAM_RAM_GB"] = str(ram_gb)
    os.environ["NEXUS_BEAM_VOLUME"] = volume_name
    os.environ["NEXUS_BEAM_PORT"] = str(port)
    if env:
        for k, v in env.items():
            if v is not None:
                os.environ[str(k)] = str(v)
    spec = importlib.util.spec_from_file_location("nexus_beam_app", _APP_PATH)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class BeamAdapter(ProviderAdapter):
    spec = SPEC

    def __init__(self, creds: dict[str, str]):
        super().__init__(creds)
        self._endpoint: Endpoint | None = None
        self._spec: DeploySpec | None = None
        self._pod_ready = False
        # One generated Bearer per account (persisted back into the encrypted
        # store by the router when first generated). Guards the deployed app.
        self._secret = (creds or {}).get("nexus_secret") or secrets.token_urlsafe(32)

    @property
    def secret(self) -> str:
        return self._secret

    # ---- credentials -----------------------------------------------------
    def connect(self) -> None:
        token = (self.creds.get("api_token") or "").strip()
        if not token:
            raise ValueError("Beam API token is required.")
        if "beam" not in sys.modules:
            try:
                import beam  # noqa: F401
            except ImportError as e:
                raise RuntimeError(
                    "'beam' package is not installed in this ComfyUI's Python. "
                    "Run: pip install beam-client"
                ) from e
        os.environ["BEAM_TOKEN"] = token
        workspace = (self.creds.get("workspace_id") or "").strip()
        if workspace:
            os.environ["BEAM_WORKSPACE_ID"] = workspace
        # The deployed app's Bearer guard (baked into the Pod env by
        # nexus_beam_app.py at deploy time).
        os.environ["NEXUS_SECRET"] = self._secret

    def _require_connected(self) -> None:
        if not os.environ.get("BEAM_TOKEN"):
            raise RuntimeError("Not authenticated. Connect a Beam account first.")

    # ---- deploy ----------------------------------------------------------
    def _pod_url(self) -> str:
        try:
            import beam
            cont = beam.Pod.from_name(self._pod_name)
            return getattr(cont, "url", "") or ""
        except Exception:
            return ""

    def provision(self, spec: DeploySpec) -> Endpoint:
        self._require_connected()
        if self._endpoint and self._endpoint.meta.get("gpu") == spec.gpu_model:
            return self._endpoint

        mod = _load_app(gpu=spec.gpu_model, cpu=spec.cpu, ram_gb=spec.ram_gb,
                        volume_name=spec.volume_name, env=spec.env)
        pod = mod.pod

        port = mod.COMFYUI_PORT
        try:
            res = pod.create()
        except Exception as e:
            raise RuntimeError(f"beam pod.create() failed: {e} [check your token & quota]") from e

        url = getattr(res, "url", "") or self._pod_url()
        if not url:
            raise RuntimeError("Beam created a pod but no URL was returned.")

        base = str(url).split("?")[0].rstrip("/")
        self._endpoint = Endpoint(
            base_url=base,
            secret=self._secret, kind="model-api",
            meta={"provider": "beam", "gpu": spec.gpu_model,
                  "pod": self._pod_name, "port": port,
                  "deployed_at": time.time()},
        )
        self._spec = spec
        return self._endpoint

    # ---- runtime ---------------------------------------------------------
    def run(self, workflow: dict[str, Any],
            input_images: dict[str, str] | None = None) -> dict[str, Any]:
        if not self._endpoint or not self._endpoint.base_url:
            raise RuntimeError("Not deployed. Provision a Beam account first.")
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
            raise RuntimeError("Not deployed. Provision a Beam account first.")
        client = ComfyHttpClient(self._endpoint.base_url, secret=self._endpoint.secret,
                                 timeout=1200)
        client._json("POST", "/workflow-models/download", {"url": url, "folder": folder})

    def stop(self) -> None:
        """Beam pods scale to zero on their own (keep_warm_seconds): nothing to stop."""
        self._endpoint = None

    def teardown(self) -> None:
        try:
            import beam
            beam.Pod.delete(self._pod_name)
        except Exception as e:
            print(f"[nexus-cloud] could not delete Beam pod: {e}")
        self._endpoint = None

    def _estimate_cost(self) -> Optional[float]:
        for g in _GPUS:
            if g.id == self._endpoint.meta.get("gpu"):
                return g.usd_per_hr
        return None