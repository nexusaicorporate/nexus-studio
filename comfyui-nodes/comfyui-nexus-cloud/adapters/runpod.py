# Nexus Cloud — RunPod adapter (STUB)
#
# API-provision family. RunPod exposes REST/GraphQL to launch a prebuilt
# ComfyUI worker image (Pod or Serverless endpoint) and attach a Network Volume
# ($0.07/GB/mo) that survives teardown — solves the re-download problem.
#
# Status: declared for the sidebar; provision/run raise until wired.
from __future__ import annotations

from .base import CredField, GpuOption, ProviderAdapter, ProviderSpec

SPEC = ProviderSpec(
    id="runpod",
    label="RunPod",
    family="api-provision",
    implemented=False,
    cred_fields=[
        CredField("api_key", "RunPod API Key", secret=True,
                  help="runpod.io → Settings → API Keys"),
    ],
    gpu_options=[
        GpuOption("NVIDIA RTX A5000", "RTX A5000 · 24 GB", 24, 0.26),
        GpuOption("NVIDIA L40S", "L40S · 48 GB", 48, 0.86),
        GpuOption("NVIDIA A100 80GB", "A100 · 80 GB", 80, 1.64),
    ],
    default_gpu="NVIDIA L40S",
    default_volume_gb=200,
    persistent_storage=True,
    docs_url="https://docs.runpod.io",
    summary="On-demand Pods + Serverless via REST/GraphQL. Network Volume "
            "($0.07/GB/mo) persists independently of the worker.",
)


class RunPodAdapter(ProviderAdapter):
    spec = SPEC
    # Implement next: REST calls to create a Pod from a ComfyUI image + attach a
    # Network Volume; expose the Pod's proxy URL as the endpoint; call its
    # /prompt HTTP API. (API-provision family — different mechanism from Modal.)
