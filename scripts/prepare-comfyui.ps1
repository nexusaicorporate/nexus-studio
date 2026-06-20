<#
.SYNOPSIS
  Prepares the bundled ComfyUI that ships inside the Nexus desktop installer.

  Builds a turnkey, native ComfyUI:
    1. Downloads the official ComfyUI Windows portable.
    2. Installs every custom node listed in scripts/comfyui-nodes.json
       (e.g. comfyui-modal, ComfyUI-Manager, + any you add) and their
       Python requirements into the bundled embedded Python.
    3. Overlays any configuration from src-tauri/comfyui-config/ onto the tree.

  The result (src-tauri/resources/comfyui) is bundled by Tauri so the packaged
  app contains ComfyUI + all nodes + config, ready to run offline.

  Run BEFORE `npm run desktop:build` (and in CI before tauri build).

.NOTES
  Windows only (this milestone). The portable bundles its own Python
  (python_embeded), so the end user needs no system Python.
#>

param(
  [string]$ComfyAsset = "ComfyUI_windows_portable_nvidia.7z",
  [switch]$Force
)

$ErrorActionPreference = "Stop"
$root      = Split-Path -Parent $PSScriptRoot
$resources = Join-Path $root "src-tauri\resources"
$dest      = Join-Path $resources "comfyui"
$configSrc = Join-Path $root "src-tauri\comfyui-config"
$manifest  = Join-Path $PSScriptRoot "comfyui-nodes.json"
$tmp       = Join-Path $env:TEMP "nexus-comfy-prepare"

Write-Host "==> Preparing bundled ComfyUI at $dest"

if ($Force -and (Test-Path $dest)) {
  Write-Host "    -Force: removing existing $dest"
  Remove-Item -Recurse -Force $dest
}

New-Item -ItemType Directory -Force -Path $resources, $tmp | Out-Null

# 1. Ensure a 7-Zip extractor is available (portable ships as .7z).
$sevenZipCmd = Get-Command 7z -ErrorAction SilentlyContinue
$sevenZip = if ($sevenZipCmd) { $sevenZipCmd.Source } else { $null }
if (-not $sevenZip) {
  $sevenZip = Join-Path $tmp "7zr.exe"
  if (-not (Test-Path $sevenZip)) {
    Write-Host "==> Fetching standalone 7zr.exe"
    Invoke-WebRequest -Uri "https://www.7-zip.org/a/7zr.exe" -OutFile $sevenZip
  }
}

# 2. Download + extract the ComfyUI Windows portable (skip if already laid down).
if (-not (Test-Path (Join-Path $dest "ComfyUI\main.py"))) {
  $archive = Join-Path $tmp $ComfyAsset
  if (-not (Test-Path $archive)) {
    $url = "https://github.com/comfyanonymous/ComfyUI/releases/latest/download/$ComfyAsset"
    Write-Host "==> Downloading $url (this is ~1.5 GB)"
    Invoke-WebRequest -Uri $url -OutFile $archive
  }
  Write-Host "==> Extracting"
  $extractDir = Join-Path $tmp "extract"
  if (Test-Path $extractDir) { Remove-Item -Recurse -Force $extractDir }
  & $sevenZip x $archive "-o$extractDir" -y | Out-Null
  $inner = Join-Path $extractDir "ComfyUI_windows_portable"
  if (-not (Test-Path $inner)) { $inner = $extractDir }
  New-Item -ItemType Directory -Force -Path $dest | Out-Null
  Copy-Item -Path (Join-Path $inner "*") -Destination $dest -Recurse -Force
} else {
  Write-Host "    ComfyUI base already present. Skipping download (use -Force to rebuild)."
}

$python      = Join-Path $dest "python_embeded\python.exe"
$customNodes = Join-Path $dest "ComfyUI\custom_nodes"
New-Item -ItemType Directory -Force -Path $customNodes | Out-Null

# 2b. Pin the known-good BASE so no custom-node install (now or later, via
#     ComfyUI-Manager or git) can change the core packages and break everything.
#     pip honours $env:PIP_CONSTRAINT for ALL installs in this process tree.
$constraints = Join-Path $dest "constraints.txt"
$protected = @("torch","torchvision","torchaudio","torchsde","xformers","numpy","pillow",
               "transformers","safetensors","tokenizers","accelerate","diffusers","huggingface-hub",
               "opencv-python","opencv-python-headless","scipy","kornia","einops")
& $python -m pip freeze | Out-File -Encoding ascii (Join-Path $tmp "base-freeze.txt")
$pinned = foreach ($line in (Get-Content (Join-Path $tmp "base-freeze.txt"))) {
  $name = (($line -split "==")[0]).Trim().ToLower()
  if ($protected -contains $name) { $line }
}
"# Nexus AI Studio - protected core (custom nodes must not change these versions)" | Out-File -Encoding ascii $constraints
$pinned | Out-File -Encoding ascii -Append $constraints
$env:PIP_CONSTRAINT = $constraints
Write-Host "==> Pinned $(@($pinned).Count) core packages in constraints.txt"

# 3. Install every custom node from the manifest + its requirements (constrained).
#    Two source kinds: 'local' (a path in this repo - nodes we own, copied) and
#    'repo' (a git URL - third-party, cloned/updated).
# Native commands (git/pip) write progress to stderr; under -ErrorAction Stop
# that aborts the build even on success, so relax to Continue here and rely on
# each command's exit code ($LASTEXITCODE) instead.
$ErrorActionPreference = 'Continue'
$spec = Get-Content $manifest -Raw | ConvertFrom-Json
foreach ($node in $spec.nodes) {
  $nodeDir = Join-Path $customNodes $node.name
  if ($node.local) {
    $srcDir = Join-Path $root $node.local
    if (-not (Test-Path $srcDir)) { throw "Local node source not found: $srcDir" }
    Write-Host "==> Copying local node $($node.name) <- $($node.local)"
    if (Test-Path $nodeDir) { Remove-Item -Recurse -Force $nodeDir }
    New-Item -ItemType Directory -Force -Path $nodeDir | Out-Null
    # Copy node source, excluding any dev cruft.
    Copy-Item -Path (Join-Path $srcDir "*") -Destination $nodeDir -Recurse -Force `
      -Exclude @("__pycache__", "*.pyc", ".git")
  } elseif (Test-Path $nodeDir) {
    Write-Host "==> Updating node $($node.name)"
    git -C $nodeDir pull --ff-only 2>&1 | Out-Null   # stderr is just progress; ignore
  } else {
    Write-Host "==> Cloning node $($node.name) <- $($node.repo)"
    git clone --depth 1 $node.repo $nodeDir 2>&1 | Write-Host
    if ($LASTEXITCODE -ne 0) { throw "git clone failed for $($node.name) ($($node.repo))" }
    if ($node.ref) { git -C $nodeDir fetch --depth 1 origin $node.ref 2>&1 | Write-Host; git -C $nodeDir checkout $node.ref 2>&1 | Write-Host }
  }
  $req = Join-Path $nodeDir "requirements.txt"
  if (Test-Path $req) {
    Write-Host "    installing requirements for $($node.name)"
    & $python -m pip install --no-warn-script-location -r $req
  }
}

# 4. Install any extra global pip packages (e.g. modal).
foreach ($pkg in $spec.pip) {
  Write-Host "==> pip install $pkg"
  & $python -m pip install --no-warn-script-location $pkg
}

# 4b. Snapshot the full known-good environment so the app can one-click restore
#     it if a later install ever breaks something.
& $python -m pip freeze | Out-File -Encoding ascii (Join-Path $dest "nexus-snapshot.txt")
Write-Host "==> Wrote known-good snapshot nexus-snapshot.txt"

# 5. Overlay bundled configuration onto the ComfyUI tree (paths mirror the
#    ComfyUI root, e.g. comfyui-config/ComfyUI/extra_model_paths.yaml).
if (Test-Path $configSrc) {
  $hasConfig = (Get-ChildItem $configSrc -Recurse -File -ErrorAction SilentlyContinue | Measure-Object).Count -gt 0
  if ($hasConfig) {
    Write-Host "==> Overlaying configuration from src-tauri/comfyui-config"
    Copy-Item -Path (Join-Path $configSrc "*") -Destination $dest -Recurse -Force
  }
}

Write-Host "==> Done. Bundled ComfyUI + nodes + config ready at $dest"
Write-Host "    Now run: npm run desktop:build"
