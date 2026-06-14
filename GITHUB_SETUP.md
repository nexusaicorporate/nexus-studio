# GitHub: store, package & auto-update Nexus AI Studio

Workflows in `.github/workflows/`:

| Workflow | Trigger | Builds |
|---|---|---|
| **ci.yml** | push to `main`, PRs | web static build (sanity check) |
| **release.yml** | `v*` tag | **signed** Windows (`.msi`,`.exe`) + Linux (`.deb`,`.AppImage`) + macOS (`.dmg`,`.app` universal) installers → draft GitHub Release + `latest.json`; release notes auto-generated from commits |
| **pages.yml** | `v*` tag | deploys the web app to GitHub Pages |

## One-time setup
1. **Repo root must be the `nexus-studio/` folder** (so `.github/`, `package.json`, `src-tauri/` are at the top). Then:
   ```bash
   cd nexus-studio
   git init && git add . && git commit -m "Nexus AI Studio"
   git branch -M main
   git remote add origin https://github.com/OWNER/REPO.git
   git push -u origin main
   ```
   > Tip: this folder is untracked inside the original Flutter repo, so a `git clean`/checkout in that repo can delete it. Keeping it as its own repo (above) protects it.
2. **Generate the updater signing key** (after `npm install`):
   ```bash
   npx tauri signer generate -w nexus-studio.key
   ```
   (No Rust needed for this — it's part of `@tauri-apps/cli`.)
3. **Edit `src-tauri/tauri.conf.json` → `plugins.updater`**: paste the **public key** and replace `OWNER/REPO`. Commit + push.
4. **Add repo secrets** (Settings → Secrets and variables → Actions):
   - `TAURI_SIGNING_PRIVATE_KEY` = contents of `nexus-studio.key`
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` = the password you set
5. **Enable Pages**: Settings → Pages → Source: GitHub Actions.

## Cut a release
1. Bump `version` in both `package.json` and `src-tauri/tauri.conf.json` (keep equal).
2. `git tag v1.0.1 && git push origin main --tags`
3. CI builds Windows + Linux + macOS installers, generates release notes from commits, and creates a **draft** Release with installers + `latest.json`. Pages publishes the web app.
4. Review the draft Release → **Publish**. Installed apps auto-update.

## Notes
- Native installers build on their own OS — that's why the matrix uses `windows-latest`, `ubuntu-22.04`, `macos-latest`. GitHub's runners do it; you don't need those machines.
- macOS isn't Apple-notarized unless you add `APPLE_*` signing secrets; without them, users right-click → Open the first time. Auto-update still works (it uses the Tauri key, separate from Apple signing).
- `releaseDraft: true` → set `false` to auto-publish.

## Action versions / Node 24 (June 2026)
GitHub runners now default to **Node 24**, which deprecates the older `@v4` actions. These workflows are pinned to current majors:
- `actions/checkout@v5`, `actions/setup-node@v5`
- `Swatinem/rust-cache@v2` (the v2 tag now ships a Node 24 build), `dtolnay/rust-toolchain@stable`, `tauri-apps/tauri-action@v0`
- Pages (`configure-pages@v5`, `upload-pages-artifact@v3`, `deploy-pages@v4`) don't have Node 24 builds yet, so `pages.yml` sets `ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION: "true"` to keep them running until GitHub updates them. Delete that `env:` line once the Pages actions ship Node 24 versions.

### Two structural prerequisites (or every workflow fails)
1. The **repo root must be the `nexus-studio/` folder** so `.github/workflows/` is at the top level and `package.json`/`src-tauri/` are at the root the workflows expect.
2. **Pages → Settings → Pages → Source: GitHub Actions** must be enabled, or `deploy-pages` errors with "Pages site not configured."
