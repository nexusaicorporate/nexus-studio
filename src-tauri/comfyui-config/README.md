# Bundled ComfyUI configuration overlay

Anything placed in this folder is **copied onto the bundled ComfyUI tree** at build time by
`scripts/prepare-comfyui.ps1`, so it ships inside the native install. Paths here mirror the
ComfyUI root (the folder that contains `ComfyUI/` and `python_embeded/`).

Examples:

```
src-tauri/comfyui-config/
└── ComfyUI/
    ├── extra_model_paths.yaml                      → ComfyUI/extra_model_paths.yaml
    └── user/default/ComfyUI-Manager/config.ini     → ComfyUI-Manager settings
```

- This folder **is committed** (it's small, hand-authored config) — unlike the fetched
  `src-tauri/resources/comfyui/` tree, which is git-ignored and downloaded at build time.
- Add custom nodes in `scripts/comfyui-nodes.json`; add their configuration here.
- On the user's machine the configured tree is copied into the writable managed folder on
  first run, so these files become the defaults the app ships with.
