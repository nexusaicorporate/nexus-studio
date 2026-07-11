# Nexus Cloud — Beam adapter (STUB)
#
# SDK-deploy family (Modal-like). Beam (beam.cloud) is an open-source serverless
# GPU runtime with a Python SDK, sub-second cold boots, GPU checkpoint/restore,
# and persistent storage Volumes — the closest match to the Modal pattern.
#
# Status: declared so it appears in the sidebar, but provision/run raise
# NotImplementedAdapter until the SDK deploy path is written (mirror modal.py).
from __future__ import annotations

from .base import CredField, GpuOption, ProviderAdapter, ProviderSpec

SPEC = ProviderSpec(
    id="beam",
    label="Beam",
    family="sdk-deploy",
    implemented=False,
    cred_fields=[
        CredField("api_token", "Beam API Token", secret=True,
                  help="beam.cloud → Settings → API Keys"),
    ],
    gpu_options=[
        GpuOption("T4", "T4 · 16 GB", 16, 0.40),
        GpuOption("A10G", "A10G · 24 GB", 24, 0.95),
        GpuOption("A100-40", "A100 · 40 GB", 40, 2.10),
        GpuOption("L40S", "L40S · 48 GB", 48, 1.50),
    ],
    default_gpu="L40S",
    default_volume_gb=200,
    persistent_storage=True,
    docs_url="https://docs.beam.cloud",
    summary="Open-source serverless GPU, Python SDK, <1s cold boots, GPU "
            "checkpoint restore, persistent Volumes. Modal-like deploy model.",
)


class BeamAdapter(ProviderAdapter):
    spec = SPEC
    # Implement connect/provision/status/run/stop next, mirroring modal.py:
    #   - use the `beam` SDK to deploy an Endpoint/Pod serving ComfyUI
    #   - mount a Beam Volume at models/ for persistence
