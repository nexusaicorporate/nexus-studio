# Nexus Cloud — provider adapter interface
#
# Every cloud-GPU provider (Modal, Beam, …) is one adapter implementing THIS
# interface. The sidebar UI, the account store and the /prompt router never know
# which provider is active — they only talk to `base.ProviderAdapter`.
#
# Adding a provider = adding one file in this folder that subclasses
# ProviderAdapter and is registered in REGISTRY (see __init__.py of this pkg).
#
# Two internal families exist behind the same interface:
#   - SDK-deploy   (Modal, Beam): provision() uses the provider's Python SDK
#                  to deploy an app + persistent Volume + served ComfyUI.
#   - API-provision (future: RunPod, Vast): provision() calls the provider's
#                  REST/GraphQL to launch a prebuilt ComfyUI worker image.
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Optional


@dataclass
class CredField:
    """One credential input the sidebar renders for this provider."""
    key: str                      # machine name, e.g. "token_id"
    label: str                    # shown in the UI, e.g. "Token ID (ak-…)"
    secret: bool = True           # render as a password field
    placeholder: str = ""
    help: str = ""


@dataclass
class GpuOption:
    """A GPU profile the provider offers (for the dropdown + cost hint)."""
    id: str                       # provider's GPU id, e.g. "L40S"
    label: str                    # "L40S · 48 GB"
    vram_gb: int = 0
    usd_per_hr: Optional[float] = None   # rough hint, may be None
    note: str = ""


@dataclass
class ProviderSpec:
    """What the sidebar needs to render a provider's card before connecting."""
    id: str                       # "modal", "beam", …
    label: str                    # "Modal"
    family: str                   # "sdk-deploy" | "api-provision"
    implemented: bool             # False => show but disable Connect/Deploy
    cred_fields: list[CredField] = field(default_factory=list)
    gpu_options: list[GpuOption] = field(default_factory=list)
    # Defaults for the GPU profile editor
    default_gpu: str = ""
    default_cpu: int = 8
    default_ram_gb: int = 48
    default_volume_gb: int = 200
    persistent_storage: bool = True   # False => warn the user (e.g. Vast)
    docs_url: str = ""
    summary: str = ""


@dataclass
class DeploySpec:
    """The hardware profile the user picked in the sidebar."""
    gpu_model: str
    gpu_count: int = 1
    cpu: int = 8
    ram_gb: int = 48
    volume_name: str = "nexus-models"
    volume_size_gb: int = 200
    env: dict[str, Any] = field(default_factory=dict)  # extra container env (model ids, …)


@dataclass
class Endpoint:
    """A running provider endpoint the router/Studios can call."""
    base_url: str                 # e.g. https://…modal.run  (ComfyUI web)
    secret: str = ""              # Bearer the app sends
    kind: str = "comfyui"         # "comfyui" | "model-api"
    meta: dict[str, Any] = field(default_factory=dict)


@dataclass
class Status:
    running: bool = False
    gpu: str = ""
    uptime_s: int = 0
    est_cost_usd: Optional[float] = None
    volume_used_gb: Optional[float] = None
    models: list[str] = field(default_factory=list)
    message: str = ""


class NotImplementedAdapter(Exception):
    """Raised by stub adapters whose provider isn't wired up yet."""


class ProviderAdapter:
    """Subclass this once per provider. All methods may raise; the server
    catches and returns a structured error so one bad provider can't crash
    ComfyUI."""

    spec: ProviderSpec  # class attribute every adapter sets

    def __init__(self, creds: dict[str, str]):
        self.creds = creds or {}

    # ---- lifecycle -------------------------------------------------------
    def connect(self) -> None:
        """Validate credentials. Raise on failure. No side effects on the
        provider account beyond auth."""
        raise NotImplementedAdapter(self.spec.label)

    def provision(self, spec: DeploySpec) -> Endpoint:
        """Ensure a running endpoint for the given hardware profile, with a
        persistent volume mounted at ComfyUI's models/ path. Idempotent:
        return the existing endpoint if already up."""
        raise NotImplementedAdapter(self.spec.label)

    def status(self) -> Status:
        raise NotImplementedAdapter(self.spec.label)

    def run(self, workflow: dict[str, Any], input_images: dict[str, str] | None = None) -> dict[str, Any]:
        """Execute a ComfyUI prompt graph on the active endpoint. Input images
        for LoadImage nodes are sent as base64 and staged on the container.
        Returns {"images": [{filename,data,node_id}], "videos": […]} so the
        local node can replay the finished outputs into ComfyUI's UI."""
        raise NotImplementedAdapter(self.spec.label)

    def download_model(self, url: str, folder: str,
                       on_progress: Optional[Callable[[float], None]] = None) -> None:
        """Pull a model into the persistent volume under models/<folder>/."""
        raise NotImplementedAdapter(self.spec.label)

    def stop(self) -> None:
        """Scale the endpoint to zero / stop billing. Keep the volume."""
        raise NotImplementedAdapter(self.spec.label)

    def teardown(self) -> None:
        """Remove the deployed app entirely (volume optionally kept)."""
        raise NotImplementedAdapter(self.spec.label)