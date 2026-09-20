# Nexus Cloud — ComfyUI server routes
#
# The sidebar talks ONLY to these endpoints. Everything here delegates to the
# Router singleton, which owns accounts/order/lifecycle/failover. Responses are
# JSON; errors are always structured, never HTML, so the frontend can render
# them inline.
from __future__ import annotations

import time
from typing import Any

from aiohttp import web

from . import prompt_router as pr
from .router import get_router
from .adapters import SPECS, available_providers

_NEXUS_REGISTERED = False


def _err(message: str, status: int = 400) -> web.Response:
    return web.json_response({"status": "error", "message": message}, status=status)


async def _providers(_: web.Request) -> web.Response:
    specs = {}
    for pid, spec in SPECS.items():
        specs[pid] = {
            "id": spec.id,
            "label": spec.label,
            "family": spec.family,
            "implemented": spec.implemented,
            "available": available_providers().get(pid, False),
            "cred_fields": [{"key": f.key, "label": f.label, "secret": f.secret,
                             "placeholder": f.placeholder, "help": f.help}
                            for f in spec.cred_fields],
            "gpu_options": [{"id": g.id, "label": g.label, "vram_gb": g.vram_gb,
                             "usd_per_hr": g.usd_per_hr, "note": g.note}
                            for g in spec.gpu_options],
            "default_gpu": spec.default_gpu,
            "default_cpu": spec.default_cpu,
            "default_ram_gb": spec.default_ram_gb,
            "default_volume_gb": spec.default_volume_gb,
            "persistent_storage": spec.persistent_storage,
            "docs_url": spec.docs_url,
            "summary": spec.summary,
        }
    return web.json_response({"providers": specs})


async def _status(_: web.Request) -> web.Response:
    return web.json_response(get_router().status())


async def _save_account(request: web.Request) -> web.Response:
    try:
        body = await request.json()
    except Exception:
        return _err("Invalid JSON body")
    provider = (body.get("provider") or "").strip()
    name = (body.get("account") or body.get("name") or "").strip()
    label = (body.get("label") or "").strip()
    creds = body.get("creds") or {}
    profile = body.get("profile") or {}
    if not provider or not name:
        return _err("provider and account (name) are required")
    if provider not in SPECS:
        return _err(f"Unknown provider '{provider}'")
    if not isinstance(creds, dict) or not isinstance(profile, dict):
        return _err("creds and profile must be objects")
    # Masked sentinels (values ending in '…') mean "keep the stored secret".
    creds = {k: v for k, v in creds.items()
             if v is not None and not (isinstance(v, str) and v.endswith("…"))}
    get_router().save_account(provider, name, label=label,
                              creds=creds or None, profile=profile)
    return web.json_response({"status": "ok"})


async def _delete_account(request: web.Request) -> web.Response:
    body = await _json_or(request)
    provider = (body.get("provider") or "").strip()
    name = (body.get("account") or body.get("name") or "").strip()
    if not provider or not name:
        return _err("provider and account required")
    removed = get_router().delete_account(provider, name)
    if not removed:
        return _err(f"No account '{name}' for {provider}", status=404)
    return web.json_response({"status": "ok"})


async def _json_or(request: web.Request):
    try:
        return await request.json()
    except Exception:
        return {}


async def _set_order(request: web.Request) -> web.Response:
    body = await _json_or(request)
    entries = body.get("order")
    if not isinstance(entries, list):
        return _err("order must be [{provider, account}, …]")
    get_router().set_order(entries)
    return web.json_response({"status": "ok", "order": get_router().order()})


async def _toggle(request: web.Request) -> web.Response:
    body = await _json_or(request)
    if "enabled" not in body:
        return _err("enabled required (bool)")
    get_router().set_enabled(bool(body["enabled"]))
    return web.json_response({"status": "ok", "enabled": get_router().enabled})


async def _failover(request: web.Request) -> web.Response:
    body = await _json_or(request)
    if "auto_failover" in body:
        get_router().set_auto_failover(bool(body["auto_failover"]))
    return web.json_response({"status": "ok",
                              "auto_failover": get_router().auto_failover})


async def _failover_now(_: web.Request) -> web.Response:
    try:
        await _rotate_now()
        return web.json_response({"status": "ok"})
    except Exception as e:
        return _err(str(e), status=500)


async def _rotate_now():
    """Manually force failover to the next account in order."""
    r = get_router()
    active = r.active()
    order = r.order()
    if not order:
        return
    if not active:
        # nothing live; connect primary.
        first = order[0]
        r.connect(first["provider"], first["account"])
        return
    idx = next((i for i, e in enumerate(order)
                if e["provider"] == active["provider"] and e["account"] == active["account"]), 0)
    next_entry = order[(idx + 1) % len(order)]
    r.connect(next_entry["provider"], next_entry["account"])


async def _connect(request: web.Request) -> web.Response:
    body = await _json_or(request)
    provider = (body.get("provider") or "").strip()
    name = (body.get("account") or body.get("name") or "").strip()
    if not provider or not name:
        return _err("provider and account required")
    try:
        result = get_router().connect(provider, name)
        return web.json_response(result)
    except Exception as e:
        return _err(str(e), status=500)


async def _deploy(request: web.Request) -> web.Response:
    """Re-provision the active account with (optional) hardware overrides →
    saved into its profile."""
    body = await _json_or(request)
    r = get_router()
    active = r.active()
    if not active:
        return _err("No active account. Connect one first.")
    if body:
        # persist overrides to the active account profile
        profile = body.get("profile") or body
        acc = next((a for a in r.accounts()
                    if a["provider"] == active["provider"]
                    and a["name"] == active["account"]), None)
        merged = dict(acc.get("profile") or {}) if acc else {}
        for k in ("gpu", "gpu_count", "cpu", "ram_gb", "volume_name", "volume_size_gb"):
            if k in profile:
                merged[k] = profile[k]
        from . import accounts as acct
        acct.get_account_store().save(active["provider"], active["account"],
                                      profile=merged)
    try:
        result = r.connect(active["provider"], active["account"])
        return web.json_response(result)
    except Exception as e:
        return _err(str(e), status=500)


async def _download_model(request: web.Request) -> web.Response:
    body = await _json_or(request)
    url = (body.get("url") or "").strip()
    folder = (body.get("folder") or "checkpoints").strip()
    if not url.startswith(("http://", "https://")):
        return _err("url must be http(s)")
    try:
        return web.json_response(get_router().download_model(url, folder))
    except Exception as e:
        return _err(str(e), status=500)


async def _stop(request: web.Request) -> web.Response:
    get_router().stop()
    return web.json_response({"status": "ok"})


ROUTES = [
    web.get("/nexus-cloud/providers", _providers),
    web.get("/nexus-cloud/status", _status),
    web.post("/nexus-cloud/accounts", _save_account),
    web.delete("/nexus-cloud/accounts", _delete_account),
    web.post("/nexus-cloud/order", _set_order),
    web.post("/nexus-cloud/toggle", _toggle),
    web.post("/nexus-cloud/failover", _failover),
    web.post("/nexus-cloud/failover/now", _failover_now),
    web.post("/nexus-cloud/connect", _connect),
    web.post("/nexus-cloud/deploy", _deploy),
    web.post("/nexus-cloud/models/download", _download_model),
    web.post("/nexus-cloud/stop", _stop),
]


def register() -> None:
    """Hook into ComfyUI's PromptServer. Called from __init__.py."""
    global _NEXUS_REGISTERED
    if _NEXUS_REGISTERED:
        return

    from server import PromptServer
    _PromptServer = PromptServer.instance
    if _PromptServer is None:
        print("[nexus-cloud] PromptServer unavailable; routes not registered.")
        return

    for route in ROUTES:
        try:
            _PromptServer.routes.add_route(route.method, route.path, route.handler)
        except Exception as e:
            print(f"[nexus-cloud] Could not add route {route.path}: {e}")

    pr.register_prompt_router(_PromptServer.routes)
    print(f"[nexus-cloud] Server routes registered: "
          f"{', '.join(r.path for r in ROUTES)} + /prompt (interceptor)")
    _NEXUS_REGISTERED = True