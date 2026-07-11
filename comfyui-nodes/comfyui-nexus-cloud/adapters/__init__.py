# Nexus Cloud — adapter registry
#
# The single source of truth for which providers exist. The server reads
# REGISTRY to build the sidebar dropdown and to instantiate the active adapter.
# Add a provider: write adapters/<id>.py with a ProviderAdapter subclass + SPEC,
# then add it here.
from __future__ import annotations

from .base import ProviderAdapter, ProviderSpec
from .modal import ModalAdapter
from .beam import BeamAdapter
from .cerebrium import CerebriumAdapter
from .runpod import RunPodAdapter
from .vast import VastAdapter

# id -> adapter class
REGISTRY: dict[str, type[ProviderAdapter]] = {
    ModalAdapter.spec.id: ModalAdapter,
    BeamAdapter.spec.id: BeamAdapter,
    CerebriumAdapter.spec.id: CerebriumAdapter,
    RunPodAdapter.spec.id: RunPodAdapter,
    VastAdapter.spec.id: VastAdapter,
}


def list_specs() -> list[ProviderSpec]:
    return [cls.spec for cls in REGISTRY.values()]


def get_adapter(provider_id: str, creds: dict) -> ProviderAdapter:
    cls = REGISTRY.get(provider_id)
    if not cls:
        raise KeyError(f"Unknown provider '{provider_id}'.")
    return cls(creds)
