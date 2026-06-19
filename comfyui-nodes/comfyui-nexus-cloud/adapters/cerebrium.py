# Nexus Cloud — Cerebrium adapter (STUB)
#
# SDK-deploy family. Cerebrium is a serverless GPU platform (Python/Cortex
# config deploys), autoscaling, persistent volume storage. Modal-like shape.
#
# Status: declared for the sidebar; provision/run raise until wired.
from __future__ import annotations

from .base import CredField, GpuOption, ProviderAdapter, ProviderSpec

SPEC = ProviderSpec(
    id="cerebrium",
    label="Cerebrium",
    family="sdk-deploy",
    implemented=False,
    cred_fields=[
        CredField("api_key", "Cerebrium API Key", secret=True,
                  help="dashboard.cerebrium.ai → API Keys"),
    ],
    gpu_options=[
        GpuOption("AMPERE_A10", "A10 · 24 GB", 24, 1.00),
        GpuOption("AMPERE_A100", "A100 · 40 GB", 40, 2.40),
        GpuOption("ADA_L40", "L40 · 48 GB", 48, 1.60),
    ],
    default_gpu="ADA_L40",
    default_volume_gb=200,
    persistent_storage=True,
    docs_url="https://docs.cerebrium.ai",
    summary="Serverless GPU with config-based deploys, autoscaling, and "
            "persistent volumes. SDK-deploy family like Modal/Beam.",
)


class CerebriumAdapter(ProviderAdapter):
    spec = SPEC
    # Implement next, mirroring modal.py (deploy a Cortex app serving ComfyUI +
    # a persistent volume mounted at models/).
