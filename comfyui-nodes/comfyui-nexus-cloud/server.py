# Nexus Cloud — ComfyUI server routes + /prompt router
#
# Registers HTTP routes on ComfyUI's aiohttp app so the sidebar can drive the
# active provider, and intercepts prompt submission to route graphs to the
# active provider's endpoint when Nexus Cloud is ON.
#
# State is process-local (one active provider at a time). Creds are held in
# memory for the session only; the front-end persists them in localStorage.
from __future__ import annotations

import json
import traceback
from dataclasses import asdict
from typing import Optional

from aiohttp import web

from .adapters import REGISTRY, get_adapter, list_specs
from .adapters.base import DeploySpec, NotImplementedAdapter, ProviderAdapter

try:
    from server import PromptServer  # ComfyUI's server singleton
except Exception:  # pragma: no cover - only importable inside ComfyUI
    PromptServer = None


class _State:
    def __init__(self) -> None:
        self.enabled: bool = False
        self.provider_id: str = ""
        self.adapter: Optional[ProviderAdapter] = None


STATE = _State()


def _specs_payload() -> list[dict]:
    out = []
    for s in list_specs():
        d = asdict(s)
        out.append(d)
    return out


def _ok(data: dict) -> web.Response:
    return web.json_response({"ok": True, **data})


def _err(msg: str, code: int = 400) -> web.Response:
    return web.json_response({"ok": False, "error": msg}, status=code)


def register(app: web.Application) -> None:
    routes = web.RouteTableDef()

    @routes.get("/nexus-cloud/providers")
    async def providers(_req):
        return _ok({"providers": _specs_payload(),
                    "active": STATE.provider_id, "enabled": STATE.enabled})

    @routes.post("/nexus-cloud/connect")
    async def connect(req):
        body = await req.json()
        pid = body.get("provider", "")
        creds = body.get("creds", {})
        if pid not in REGISTRY:
            return _err(f"Unknown provider '{pid}'.")
        try:
            adapter = get_adapter(pid, creds)
            adapter.connect()
            STATE.adapter = adapter
            STATE.provider_id = pid
            return _ok({"connected": True, "provider": pid})
        except NotImplementedAdapter:
            return _err(f"{pid} isn't wired up yet — it shows in the list but "
                        f"can't connect. Use Modal for now.", code=501)
        except Exception as e:
            return _err(f"Connect failed: {e}")

    @routes.post("/nexus-cloud/deploy")
    async def deploy(req):
        body = await req.json()
        if not STATE.adapter:
            return _err("Connect first.")
        try:
            spec = DeploySpec(
                gpu_model=body.get("gpu", STATE.adapter.spec.default_gpu),
                gpu_count=int(body.get("gpu_count", 1)),
                cpu=int(body.get("cpu", STATE.adapter.spec.default_cpu)),
                ram_gb=int(body.get("ram_gb", STATE.adapter.spec.default_ram_gb)),
                volume_name=body.get("volume_name", "nexus-models"),
                volume_size_gb=int(body.get("volume_gb",
                                            STATE.adapter.spec.default_volume_gb)),
            )
            ep = STATE.adapter.provision(spec)
            STATE.enabled = True
            return _ok({"endpoint": ep.base_url, "kind": ep.kind})
        except NotImplementedAdapter:
            return _err(f"{STATE.provider_id} deploy isn't implemented yet.",
                        code=501)
        except Exception as e:
            traceback.print_exc()
            return _err(f"Deploy failed: {e}")

    @routes.get("/nexus-cloud/status")
    async def status(_req):
        if not STATE.adapter:
            return _ok({"status": {"running": False, "message": "No provider."}})
        try:
            return _ok({"status": asdict(STATE.adapter.status()),
                        "enabled": STATE.enabled, "provider": STATE.provider_id})
        except Exception as e:
            return _err(f"Status failed: {e}")

    @routes.post("/nexus-cloud/toggle")
    async def toggle(req):
        body = await req.json()
        STATE.enabled = bool(body.get("enabled", False))
        return _ok({"enabled": STATE.enabled})

    @routes.post("/nexus-cloud/models/download")
    async def models_download(req):
        body = await req.json()
        if not STATE.adapter:
            return _err("Connect + deploy first.")
        try:
            STATE.adapter.download_model(body.get("url", ""), body.get("folder", ""))
            return _ok({"queued": True})
        except Exception as e:
            return _err(f"Download failed: {e}")

    @routes.post("/nexus-cloud/stop")
    async def stop(_req):
        if STATE.adapter:
            try:
                STATE.adapter.stop()
            except Exception:
                pass
        STATE.enabled = False
        return _ok({"stopped": True})

    app.add_routes(routes)


# ---- /prompt interception -----------------------------------------------
# When Nexus Cloud is ON, forward the queued prompt to the active provider's
# endpoint instead of running it on the local (CPU-only) ComfyUI.
def _install_prompt_router() -> None:
    if PromptServer is None:
        return
    inst = PromptServer.instance
    app = inst.app
    # Wrap the existing /prompt POST handler.
    original = None
    for route in list(app.router.routes()):
        if route.method == "POST" and getattr(route.resource, "canonical", "") == "/prompt":
            original = route.handler
            break
    if original is None:
        return

    async def routed_prompt(request):
        if STATE.enabled and STATE.adapter is not None:
            try:
                payload = await request.json()
                result = STATE.adapter.run(payload)
                return web.json_response(result)
            except NotImplementedAdapter:
                return _err(f"{STATE.provider_id} run isn't implemented; "
                            f"falling back is disabled.", code=501)
            except Exception as e:
                return _err(f"Cloud run failed: {e}", code=502)
        return await original(request)

    # Re-point the handler. ComfyUI builds routes early; we patch the resource.
    for route in list(app.router.routes()):
        if route.method == "POST" and getattr(route.resource, "canonical", "") == "/prompt":
            route._handler = routed_prompt  # type: ignore[attr-defined]
            break
