# comfyui-nexus-cloud — Nexus AI Studio's own cloud-GPU node.
#
# One node, a provider dropdown (Modal, Beam, Cerebrium, RunPod, Vast). Pick a
# provider, enter creds, set a GPU profile, Connect & Deploy — ComfyUI workflows
# run on that provider's GPU with models on a persistent volume.
#
# ComfyUI loads this package and calls these module-level hooks:
#   - WEB_DIRECTORY  -> serves web/js/* as front-end extensions (the sidebar)
#   - the route registration runs at import via PromptServer.instance.app
#
# No graph NODE_CLASS_MAPPINGS are needed — this is a server/UI extension, but we
# expose empty mappings so ComfyUI treats it as a valid custom node.
from __future__ import annotations

NODE_CLASS_MAPPINGS: dict = {}
NODE_DISPLAY_NAME_MAPPINGS: dict = {}
WEB_DIRECTORY = "./web"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]


def _bootstrap() -> None:
    """Register HTTP routes + the /prompt router against ComfyUI's live server."""
    try:
        from server import PromptServer  # ComfyUI singleton
    except Exception:
        # Imported outside ComfyUI (e.g. a syntax/import check) — skip wiring.
        return
    try:
        from .server import register, _install_prompt_router
        app = PromptServer.instance.app
        register(app)
        _install_prompt_router()
        print("[nexus-cloud] routes registered (/nexus-cloud/*) + prompt router installed")
    except Exception as e:  # never crash ComfyUI on our account
        print(f"[nexus-cloud] failed to register: {e}")


_bootstrap()
