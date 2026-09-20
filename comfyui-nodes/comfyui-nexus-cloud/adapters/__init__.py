# Nexus Cloud — provider registry
#
# The sidebar and server only ever talk to providers listed here. Adding a new
# provider (e.g. RunPod, Vast) means:
#   1) add `<provider>.py` in this folder implementing base.ProviderAdapter,
#   2) import + register it below,
#   3) the UI renders it automatically from its ProviderSpec.
from __future__ import annotations

from . import base  # noqa: F401  (re-export for typing/imports elsewhere)
from .modal import ModalAdapter, SPEC as MODAL_SPEC
from .beam import BeamAdapter, SPEC as BEAM_SPEC

REGISTRY = {
    "modal": ModalAdapter,
    "beam": BeamAdapter,
}

SPECS = {
    "modal": MODAL_SPEC,
    "beam": BEAM_SPEC,
}

_available: dict[str, bool] | None = None
_SDK_MODULES = {
    "modal": "modal",
    "beam": "beam",
}


def available_providers() -> dict[str, bool]:
    """Which providers can actually run in this ComfyUI env (SDKs installed)."""
    global _available
    if _available is not None:
        return _available
    available: dict[str, bool] = {}
    for name in REGISTRY:
        sdk = _SDK_MODULES.get(name)
        try:
            if sdk:
                __import__(sdk)
            available[name] = True
        except Exception as e:
            print(f"[nexus-cloud] {name} SDK missing: {e}")
            available[name] = False
    _available = available
    return available


def get_adapter(provider: str) -> base.ProviderAdapter:
    cls = REGISTRY.get(provider)
    if cls is None:
        raise base.NotImplementedAdapter(f"Unknown provider: {provider}")
    return cls


def clear_probe_cache() -> None:
    global _available
    _available = None