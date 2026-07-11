import modal
import os
import subprocess

# Define the Modal App
app = modal.App("nexus-cloud-comfyui")

# 1. Define the Docker Image
# This installs Python, Git, PyTorch, and clones ComfyUI.
image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("git", "wget", "libgl1-mesa-glx", "libglib2.0-0")
    .pip_install(
        "torch", 
        "torchvision", 
        "torchaudio", 
        extra_options="--index-url https://download.pytorch.org/whl/cu121"
    )
    .run_commands(
        "git clone https://github.com/comfyanonymous/ComfyUI.git /workspace/ComfyUI",
        "cd /workspace/ComfyUI && pip install -r requirements.txt"
    )
)

# 2. Define Persistent Storage
# This ensures that if the container restarts, the user's models and custom nodes are saved!
# In a production app, you would dynamically name this based on the user's ID (e.g., "comfyui-data-user123")
volume = modal.Volume.from_name("nexus-comfyui-data", create_if_missing=True)

# 3. Define the Web Server Endpoint
# We use a T4 GPU (cheap but capable) and set an idle timeout of 15 minutes to save money.
@app.function(
    image=image,
    gpu="T4",
    timeout=60 * 60,          # Maximum absolute runtime of 1 hour per request
    container_idle_timeout=900, # If no one touches it for 15 mins, shut it down
    volumes={"/workspace/ComfyUI/user_data": volume} # Mount the persistent volume
)
@modal.web_server(port=8188, startup_timeout=120)
def run_comfyui():
    """
    This function starts ComfyUI and binds it to port 8188.
    Modal automatically proxies this port to a secure public HTTPS URL.
    """
    print("Starting ComfyUI on Modal...")
    
    # Symlink the persistent volume directories so they map to the correct ComfyUI folders
    # (This ensures their models and custom nodes actually get saved to the volume)
    os.makedirs("/workspace/ComfyUI/user_data/models", exist_ok=True)
    os.makedirs("/workspace/ComfyUI/user_data/custom_nodes", exist_ok=True)
    os.makedirs("/workspace/ComfyUI/user_data/output", exist_ok=True)
    
    # Remove default empty folders and link to persistent ones
    subprocess.run("rm -rf /workspace/ComfyUI/models && ln -s /workspace/ComfyUI/user_data/models /workspace/ComfyUI/models", shell=True)
    subprocess.run("rm -rf /workspace/ComfyUI/custom_nodes && ln -s /workspace/ComfyUI/user_data/custom_nodes /workspace/ComfyUI/custom_nodes", shell=True)
    subprocess.run("rm -rf /workspace/ComfyUI/output && ln -s /workspace/ComfyUI/user_data/output /workspace/ComfyUI/output", shell=True)

    # Start the ComfyUI server. 
    # Important: --listen 0.0.0.0 tells it to accept connections from the Modal router.
    # --port 8188 matches the @modal.web_server decorator.
    # --cors-header "*" allows your desktop app to embed the iframe without security blocking it.
    subprocess.Popen(
        ["python", "main.py", "--listen", "0.0.0.0", "--port", "8188", "--cors-header", "*"],
        cwd="/workspace/ComfyUI"
    )
