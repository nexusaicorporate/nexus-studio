#!/bin/bash
set -e

PROJECT_ROOT="$(pwd)"
COMFYUI_DIR="${PROJECT_ROOT}/src-tauri/resources/comfyui"

echo "==> Creating ComfyUI directory structure at ${COMFYUI_DIR}..."
mkdir -p "${COMFYUI_DIR}"

if [ ! -d "${COMFYUI_DIR}/ComfyUI" ]; then
  echo "==> Cloning ComfyUI repository..."
  git clone https://github.com/comfyanonymous/ComfyUI.git "${COMFYUI_DIR}/ComfyUI"
else
  echo "==> ComfyUI repository already exists."
fi

echo "==> Setting up Python virtual environment..."
python3 -m venv "${COMFYUI_DIR}/venv"
source "${COMFYUI_DIR}/venv/bin/activate"

echo "==> Upgrading pip..."
pip install --upgrade pip

echo "==> Installing CPU-based PyTorch (optimized for server deployment without GPU)..."
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

echo "==> Installing ComfyUI base dependencies..."
pip install -r "${COMFYUI_DIR}/ComfyUI/requirements.txt"

echo "==> Setting up custom nodes..."
CUSTOM_NODES_DIR="${COMFYUI_DIR}/ComfyUI/custom_nodes"
mkdir -p "${CUSTOM_NODES_DIR}"

# 1. comfyui-nexus-cloud (local)
echo "==> Symlinking comfyui-nexus-cloud..."
rm -rf "${CUSTOM_NODES_DIR}/comfyui-nexus-cloud"
ln -sf "${PROJECT_ROOT}/comfyui-nodes/comfyui-nexus-cloud" "${CUSTOM_NODES_DIR}/comfyui-nexus-cloud"

# 2. ComfyUI-Manager
if [ ! -d "${CUSTOM_NODES_DIR}/ComfyUI-Manager" ]; then
  echo "==> Cloning ComfyUI-Manager..."
  git clone https://github.com/ltdrdata/ComfyUI-Manager "${CUSTOM_NODES_DIR}/ComfyUI-Manager"
fi

# 3. ComfyUI-Workflow-Models-Downloader
if [ ! -d "${CUSTOM_NODES_DIR}/ComfyUI-Workflow-Models-Downloader" ]; then
  echo "==> Cloning ComfyUI-Workflow-Models-Downloader..."
  git clone https://github.com/slahiri/ComfyUI-Workflow-Models-Downloader "${CUSTOM_NODES_DIR}/ComfyUI-Workflow-Models-Downloader"
fi

# 4. ComfyUI-LTXVideo
if [ ! -d "${CUSTOM_NODES_DIR}/ComfyUI-LTXVideo" ]; then
  echo "==> Cloning ComfyUI-LTXVideo..."
  git clone https://github.com/Lightricks/ComfyUI-LTXVideo "${CUSTOM_NODES_DIR}/ComfyUI-LTXVideo"
fi

# 5. ComfyUI-KJNodes
if [ ! -d "${CUSTOM_NODES_DIR}/ComfyUI-KJNodes" ]; then
  echo "==> Cloning ComfyUI-KJNodes..."
  git clone https://github.com/kijai/ComfyUI-KJNodes "${CUSTOM_NODES_DIR}/ComfyUI-KJNodes"
fi

# 6. WhatDreamsCost-ComfyUI
if [ ! -d "${CUSTOM_NODES_DIR}/WhatDreamsCost-ComfyUI" ]; then
  echo "==> Cloning WhatDreamsCost-ComfyUI..."
  git clone https://github.com/WhatDreamsCost/WhatDreamsCost-ComfyUI "${CUSTOM_NODES_DIR}/WhatDreamsCost-ComfyUI"
fi

echo "==> Installing requirements for custom nodes..."
# Install requirements for each custom node if they exist
for node_dir in "${CUSTOM_NODES_DIR}"/*; do
  if [ -f "${node_dir}/requirements.txt" ]; then
    echo "Installing requirements for $(basename "${node_dir}")..."
    pip install -r "${node_dir}/requirements.txt" || echo "Failed to install some requirements for $(basename "${node_dir}"), continuing..."
  fi
done

# 7. comfyui-mcp-server (tool)
TOOLS_DIR="${PROJECT_ROOT}/src-tauri/resources"
if [ ! -d "${TOOLS_DIR}/comfyui-mcp-server" ]; then
  echo "==> Cloning comfyui-mcp-server..."
  git clone https://github.com/joenorton/comfyui-mcp-server "${TOOLS_DIR}/comfyui-mcp-server"
fi

if [ -f "${TOOLS_DIR}/comfyui-mcp-server/requirements.txt" ]; then
  echo "==> Installing requirements for comfyui-mcp-server..."
  pip install -r "${TOOLS_DIR}/comfyui-mcp-server/requirements.txt"
fi

# Install optional pip packages requested
echo "==> Installing extra requested pip packages (modal)..."
pip install modal

echo "==> Copying ComfyUI config overlays if they exist..."
CONFIG_SRC="${PROJECT_ROOT}/src-tauri/comfyui-config"
if [ -d "${CONFIG_SRC}" ]; then
  cp -r "${CONFIG_SRC}"/* "${COMFYUI_DIR}/ComfyUI/" || echo "Overlay copy failed, continuing..."
fi

echo "==> ComfyUI Linux environment preparation complete!"
