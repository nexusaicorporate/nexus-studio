# Nexus Cloud — multi-account GPU cloud backend for ComfyUI (Modal primary,
# Beam backup, auto-failover). One custom node, one sidebar, one /prompt hook.
#
# The router owns all accounts/order/lifecycle; server.py exposes the sidebar
# routes; prompt_router.py intercepts /prompt so ANY ComfyUI client (web UI,
# scripts, the platform) transparently runs on the active cloud provider while
# outputs replay into the local instance as if local.
#
# No credentials are read from the environment or hardcoded anywhere — they live
# encrypted at ~/.nexusai/nexus-cloud/accounts.enc (see accounts.py).
import os
import sys
import threading

_NODE_DIR = os.path.dirname(os.path.abspath(__file__))
if _NODE_DIR not in sys.path:
    sys.path.insert(0, _NODE_DIR)

NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
WEB_DIRECTORY = "web"


def _ensure_cryptography() -> None:
    """credentials are stored encrypted; make sure the crypto dep exists."""
    try:
        import cryptography  # noqa: F401
        return
    except ImportError:
        pass
    print("[nexus-cloud] 'cryptography' not found — installing...")
    try:
        import subprocess
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "cryptography"],
            check=True, capture_output=True, text=True, timeout=300,
        )
    except Exception:
        print("[nexus-cloud] WARNING: could not install 'cryptography'. "
              "Accounts will be stored in PLAINTEXT at ~/.nexusai/nexus-cloud/.")


def _init() -> None:
    try:
        import server as comfy_server
        try:
            _ensure_cryptography()
        except Exception as e:
            print(f"[nexus-cloud] cryptography check failed: {e}")
        comfy_server.register()
    except Exception as e:
        print(f"[nexus-cloud] Failed to initialize server routes: {e}")


# Defer until after ComfyUI's aiohttp server exists (imported in this module's
# own namespace at file load; PromptServer is created lazily).
_init()