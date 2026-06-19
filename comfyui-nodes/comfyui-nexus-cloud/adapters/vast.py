# Nexus Cloud — Vast.ai adapter (STUB)
#
# API-provision family. Vast.ai is a GPU marketplace (cheapest spot compute) via
# REST/CLI. Storage is the weak point: instance disk is tied to the rental and
# is LOST on teardown unless you use their (limited) persistent options — so this
# adapter is flagged persistent_storage=False to warn the user.
#
# Status: declared for the sidebar; provision/run raise until wired.
from __future__ import annotations

from .base import CredField, GpuOption, ProviderAdapter, ProviderSpec

SPEC = ProviderSpec(
    id="vast",
    label="Vast.ai",
    family="api-provision",
    implemented=False,
    cred_fields=[
        CredField("api_key", "Vast.ai API Key", secret=True,
                  help="vast.ai → Account → API Keys"),
    ],
    gpu_options=[
        GpuOption("RTX_4090", "RTX 4090 · 24 GB", 24, 0.30),
        GpuOption("L40S", "L40S · 48 GB", 48, 0.55),
        GpuOption("A100_PCIE", "A100 · 80 GB", 80, 1.00, "marketplace price varies"),
    ],
    default_gpu="L40S",
    default_volume_gb=200,
    persistent_storage=False,   # WARN: instance disk lost on teardown
    docs_url="https://vast.ai/docs",
    summary="Cheapest marketplace GPUs via REST/CLI. ⚠ Storage is fragile — "
            "instance disk is lost on teardown; re-download risk. Use a sync "
            "strategy or treat as ephemeral.",
)


class VastAdapter(ProviderAdapter):
    spec = SPEC
    # Implement next: REST calls to rent an instance from a ComfyUI image; expose
    # its host:port; call /prompt. Surface the storage caveat prominently.
