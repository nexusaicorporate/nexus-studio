#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::path::{Path, PathBuf};
use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::Manager;

// ── App-managed ComfyUI ──────────────────────────────────────────────
// ComfyUI lives in a FIXED subfolder of the app (no user-facing path).
// We prefer a "comfyui" folder next to the executable (the install dir);
// if that isn't writable (e.g. Program Files), we fall back to the app's
// per-user local data dir. Either way the user never configures it.

#[derive(Default)]
struct ComfyProc {
    child: Mutex<Option<Child>>,
}

#[derive(serde::Serialize)]
struct LaunchResult {
    ok: bool,
    pid: Option<u32>,
    message: Option<String>,
}

#[derive(serde::Serialize)]
struct InstallResult {
    ok: bool,
    message: String,
}

fn resolve_comfy_dir(app: &tauri::AppHandle) -> PathBuf {
    // 1) next to the executable (the "install path" subfolder)
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            let dir = parent.join("comfyui");
            if std::fs::create_dir_all(&dir).is_ok() {
                let probe = dir.join(".write-test");
                if std::fs::write(&probe, b"ok").is_ok() {
                    let _ = std::fs::remove_file(&probe);
                    return dir;
                }
            }
        }
    }
    // 2) fallback: per-user local data dir
    if let Ok(base) = app.path().app_local_data_dir() {
        let dir = base.join("comfyui");
        let _ = std::fs::create_dir_all(&dir);
        return dir;
    }
    PathBuf::from("comfyui")
}

// Locate ComfyUI's entry script and the python that should run it.
// Supports the Windows portable layout (python_embeded) and generic installs.
fn resolve_python_and_main(comfy_dir: &PathBuf) -> (PathBuf, PathBuf) {
    let main_py = comfy_dir.join("ComfyUI").join("main.py");

    // Windows portable: <comfy>/python_embeded/python.exe
    let embedded = comfy_dir.join("python_embeded").join("python.exe");
    if embedded.exists() {
        return (embedded, main_py);
    }
    // venv layouts
    #[cfg(windows)]
    let venv = comfy_dir.join("venv").join("Scripts").join("python.exe");
    #[cfg(not(windows))]
    let venv = comfy_dir.join("venv").join("bin").join("python");
    if venv.exists() {
        return (venv, main_py);
    }
    // generic system python
    #[cfg(windows)]
    let sys_py = PathBuf::from("python");
    #[cfg(not(windows))]
    let sys_py = PathBuf::from("python3");
    (sys_py, main_py)
}

// The ComfyUI we ship inside the installer (read-only resource dir).
fn resolve_resource_comfy(app: &tauri::AppHandle) -> Option<PathBuf> {
    if let Ok(res) = app.path().resource_dir() {
        for cand in [res.join("comfyui"), res.join("resources").join("comfyui")] {
            if cand.join("ComfyUI").join("main.py").exists() {
                return Some(cand);
            }
        }
    }
    None
}

fn copy_dir_all(src: &Path, dst: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let from = entry.path();
        let to = dst.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_dir_all(&from, &to)?;
        } else {
            std::fs::copy(&from, &to)?;
        }
    }
    Ok(())
}

#[derive(serde::Serialize)]
struct ProvisionStatus {
    provisioned: bool, // a runnable ComfyUI exists in the managed folder
    bundled: bool,     // a ComfyUI is shipped in the installer to provision from
    managed_dir: String,
}

#[tauri::command]
fn comfy_status(app: tauri::AppHandle) -> ProvisionStatus {
    let managed = resolve_comfy_dir(&app);
    ProvisionStatus {
        provisioned: managed.join("ComfyUI").join("main.py").exists(),
        bundled: resolve_resource_comfy(&app).is_some(),
        managed_dir: managed.to_string_lossy().to_string(),
    }
}

// First-run setup: copy the bundled ComfyUI into the writable managed folder.
// `gpu_type` is recorded for messaging now; per-vendor backend selection
// (NVIDIA vs AMD/DirectML vs Intel/XPU) is applied at launch and, for non-bundled
// backends, will drive a per-vendor fetch in a later milestone.
#[tauri::command]
fn provision_comfyui(app: tauri::AppHandle, gpu_type: Option<String>) -> InstallResult {
    let managed = resolve_comfy_dir(&app);
    let gpu = gpu_type.unwrap_or_else(|| "cpu".to_string());
    if managed.join("ComfyUI").join("main.py").exists() {
        return InstallResult { ok: true, message: "Already set up".into() };
    }
    let Some(src) = resolve_resource_comfy(&app) else {
        return InstallResult {
            ok: false,
            message: "Bundled ComfyUI not found in app resources (run the prepare-comfyui build step before packaging).".into(),
        };
    };
    match copy_dir_all(&src, &managed) {
        Ok(_) => InstallResult { ok: true, message: format!("ComfyUI set up in {} ({} backend)", managed.display(), gpu) },
        Err(e) => InstallResult { ok: false, message: format!("Setup copy failed: {e}") },
    }
}

#[tauri::command]
fn comfy_managed_dir(app: tauri::AppHandle) -> String {
    resolve_comfy_dir(&app).to_string_lossy().to_string()
}

#[derive(serde::Deserialize)]
struct CliArgs {
    #[serde(default)] listen: bool,
    #[serde(default)] port: Option<u16>,
    #[serde(default)] highvram: bool,
    #[serde(default)] normalvram: bool,
    #[serde(default)] lowvram: bool,
    #[serde(default)] cpu: bool,
    #[serde(default)] extra: String,
}

// Write extra_model_paths.yaml so ComfyUI also scans user-provided folders
// (e.g. a models library on an external drive). Empty list removes the file.
fn write_extra_model_paths(comfy_dir: &Path, paths: &[String]) {
    let dest = comfy_dir.join("ComfyUI").join("extra_model_paths.yaml");
    if paths.is_empty() {
        let _ = std::fs::remove_file(&dest);
        return;
    }
    let subdirs = ["checkpoints", "loras", "vae", "clip", "clip_vision", "controlnet",
                   "diffusion_models", "unet", "upscale_models", "embeddings", "vae_approx",
                   "style_models", "gligen"];
    let mut yaml = String::from("# Generated by Nexus AI Studio — extra model locations\n");
    for (i, p) in paths.iter().enumerate() {
        let norm = p.replace('\\', "/");
        yaml.push_str(&format!("nexus_extra_{i}:\n  base_path: {norm}\n"));
        for d in subdirs.iter() {
            yaml.push_str(&format!("  {d}: {d}\n"));
        }
    }
    let _ = std::fs::write(dest, yaml);
}

#[derive(serde::Deserialize, Default)]
struct ApiKeys {
    #[serde(default)] civitai: String,
    #[serde(default)] huggingface: String,
    #[serde(default)] tavily: String,
}

// Auto-fill model-provider keys into ComfyUI's native settings file so the
// workspace UI and nodes (e.g. the model downloader) read them on startup.
fn write_comfy_settings(comfy_dir: &Path, keys: &ApiKeys) {
    let dir = comfy_dir.join("ComfyUI").join("user").join("default");
    let _ = std::fs::create_dir_all(&dir);
    let path = dir.join("comfy.settings.json");
    let mut map: serde_json::Map<String, serde_json::Value> = std::fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    map.insert("WorkflowModelsDownloader.HuggingFaceToken".into(), serde_json::Value::String(keys.huggingface.clone()));
    map.insert("WorkflowModelsDownloader.CivitAIApiKey".into(), serde_json::Value::String(keys.civitai.clone()));
    map.insert("WorkflowModelsDownloader.TavilyApiKey".into(), serde_json::Value::String(keys.tavily.clone()));
    if let Ok(s) = serde_json::to_string_pretty(&serde_json::Value::Object(map)) {
        let _ = std::fs::write(&path, s);
    }
}

#[tauri::command]
fn launch_comfyui(
    app: tauri::AppHandle,
    state: tauri::State<ComfyProc>,
    cpu_only: bool,
    port: Option<u16>,
    gpu_type: Option<String>,
    extra_model_paths: Option<Vec<String>>,
    cli_args: Option<CliArgs>,
    api_keys: Option<ApiKeys>,
) -> LaunchResult {
    let comfy_dir = resolve_comfy_dir(&app);
    let (python, main_py) = resolve_python_and_main(&comfy_dir);

    // First run: copy the bundled ComfyUI into the writable managed folder.
    if !main_py.exists() {
        if let Some(src) = resolve_resource_comfy(&app) {
            let _ = copy_dir_all(&src, &comfy_dir);
        }
    }
    if !main_py.exists() {
        return LaunchResult {
            ok: false,
            pid: None,
            message: Some(format!(
                "ComfyUI is not set up in {} and no bundled copy was found in the app.",
                comfy_dir.display()
            )),
        };
    }

    // If something is already running, report it rather than double-spawn.
    {
        let mut guard = state.child.lock().unwrap();
        if let Some(c) = guard.as_mut() {
            if matches!(c.try_wait(), Ok(None)) {
                return LaunchResult { ok: true, pid: Some(c.id()), message: Some("Already running".into()) };
            }
        }
    }

    // Extra model locations (external drives / shared libraries).
    write_extra_model_paths(&comfy_dir, &extra_model_paths.unwrap_or_default());

    // Auto-fill model-provider API keys into ComfyUI's settings file (so the
    // workspace + downloader node read them) and into the process env below.
    let keys = api_keys.unwrap_or_default();
    write_comfy_settings(&comfy_dir, &keys);

    let args = cli_args.unwrap_or(CliArgs {
        listen: true, port: None, highvram: false, normalvram: false, lowvram: false, cpu: false, extra: String::new(),
    });
    let gpu = gpu_type.unwrap_or_else(|| "cpu".to_string());
    let port = args.port.or(port).unwrap_or(8188);
    let use_cpu = cpu_only || args.cpu || gpu == "cpu";

    let mut cmd = Command::new(&python);
    cmd.arg("-s").arg(&main_py)
        .arg("--port").arg(port.to_string())
        .current_dir(comfy_dir.join("ComfyUI"))
        .env("PYTHONIOENCODING", "utf-8");
    // Guardrail: any pip install that ComfyUI-Manager or a custom node triggers at
    // startup inherits PIP_CONSTRAINT, so it cannot change the pinned core packages
    // (this is what prevents one node from breaking everyone's setup).
    let constraints = comfy_dir.join("constraints.txt");
    if constraints.exists() {
        cmd.env("PIP_CONSTRAINT", &constraints);
    }
    // Model-provider keys as env vars too — broad coverage for any tool/node
    // that reads them from the environment (HF libs, CivitAI downloaders).
    if !keys.huggingface.is_empty() {
        cmd.env("HF_TOKEN", &keys.huggingface)
            .env("HUGGING_FACE_HUB_TOKEN", &keys.huggingface)
            .env("HUGGINGFACE_TOKEN", &keys.huggingface);
    }
    if !keys.civitai.is_empty() {
        cmd.env("CIVITAI_API_KEY", &keys.civitai).env("CIVITAI_TOKEN", &keys.civitai);
    }
    if !keys.tavily.is_empty() {
        cmd.env("TAVILY_API_KEY", &keys.tavily);
    }
    if args.listen { cmd.arg("--listen").arg("127.0.0.1"); }
    // The desktop webview is a different origin, so the app's fetch probes
    // (/system_stats), the model scan, /prompt POSTs and the WebSocket all need
    // CORS — without this the app can't even detect that ComfyUI is running.
    cmd.arg("--enable-cors-header").arg("*");
    if use_cpu {
        cmd.arg("--cpu");
    } else if gpu == "amd" {
        cmd.arg("--directml"); // Windows AMD path; NVIDIA needs no flag, Intel uses the XPU build
    }
    if args.highvram { cmd.arg("--highvram"); }
    if args.normalvram { cmd.arg("--normalvram"); }
    if args.lowvram { cmd.arg("--lowvram"); }
    for tok in args.extra.split_whitespace() {
        cmd.arg(tok);
    }

    // Capture ComfyUI's stdout+stderr to a log file in the managed dir so startup
    // failures (bad import, missing DLL, port in use, etc.) are visible instead of
    // the process silently dying and the app just showing "isn't running".
    let log_path = comfy_dir.join("nexus-comfy.log");
    if let Ok(f) = std::fs::File::create(&log_path) {
        if let Ok(f2) = f.try_clone() {
            cmd.stdout(std::process::Stdio::from(f));
            cmd.stderr(std::process::Stdio::from(f2));
        }
    }

    match cmd.spawn() {
        Ok(child) => {
            let pid = child.id();
            *state.child.lock().unwrap() = Some(child);
            LaunchResult { ok: true, pid: Some(pid), message: Some(format!("Launched (pid {pid}). Log: {}", log_path.display())) }
        }
        Err(e) => LaunchResult { ok: false, pid: None, message: Some(format!("Failed to launch ComfyUI: {e}")) },
    }
}

#[tauri::command]
fn stop_comfyui(state: tauri::State<ComfyProc>) -> LaunchResult {
    let mut guard = state.child.lock().unwrap();
    if let Some(mut child) = guard.take() {
        let _ = child.kill();
        let _ = child.wait();
        LaunchResult { ok: true, pid: None, message: Some("Stopped".into()) }
    } else {
        LaunchResult { ok: true, pid: None, message: Some("Not running".into()) }
    }
}

#[tauri::command]
fn install_modal_node(app: tauri::AppHandle, repo_url: String) -> InstallResult {
    let comfy_dir = resolve_comfy_dir(&app);
    let custom_nodes = comfy_dir.join("ComfyUI").join("custom_nodes");
    if std::fs::create_dir_all(&custom_nodes).is_err() {
        return InstallResult { ok: false, message: format!("Cannot create {}", custom_nodes.display()) };
    }

    let name = repo_url.trim_end_matches('/').rsplit('/').next().unwrap_or("comfyui-modal");
    let node_dir = custom_nodes.join(name);

    // Clone or update the custom node.
    let git_res = if node_dir.exists() {
        Command::new("git").arg("-C").arg(&node_dir).arg("pull").output()
    } else {
        Command::new("git").arg("clone").arg(&repo_url).arg(&node_dir).output()
    };
    match git_res {
        Ok(o) if !o.status.success() => {
            return InstallResult { ok: false, message: format!("git failed: {}", String::from_utf8_lossy(&o.stderr)) };
        }
        Err(e) => return InstallResult { ok: false, message: format!("git not available: {e}") },
        _ => {}
    }

    // Install the `modal` package into ComfyUI's python (respecting the core pins).
    let (python, _) = resolve_python_and_main(&comfy_dir);
    let mut pip = Command::new(&python);
    pip.arg("-m").arg("pip").arg("install").arg("--no-warn-script-location").arg("modal");
    let constraints = comfy_dir.join("constraints.txt");
    if constraints.exists() { pip.env("PIP_CONSTRAINT", &constraints); }
    match pip.output() {
        Ok(o) if !o.status.success() => InstallResult {
            ok: false,
            message: format!("node cloned, but `pip install modal` failed: {}", String::from_utf8_lossy(&o.stderr)),
        },
        Err(e) => InstallResult { ok: false, message: format!("node cloned, but python/pip unavailable: {e}") },
        _ => InstallResult { ok: true, message: format!("Installed {name} + modal into {}", comfy_dir.display()) },
    }
}

// Roll the managed ComfyUI back to the known-good package snapshot shipped in the
// install — recovers from a custom-node install that broke dependencies.
#[tauri::command]
fn restore_comfy_env(app: tauri::AppHandle) -> InstallResult {
    let comfy_dir = resolve_comfy_dir(&app);
    let snapshot = comfy_dir.join("nexus-snapshot.txt");
    if !snapshot.exists() {
        return InstallResult { ok: false, message: "No known-good snapshot found to restore from.".into() };
    }
    let (python, _) = resolve_python_and_main(&comfy_dir);
    let constraints = comfy_dir.join("constraints.txt");
    let mut pip = Command::new(&python);
    pip.arg("-m").arg("pip").arg("install").arg("--no-warn-script-location").arg("-r").arg(&snapshot);
    if constraints.exists() { pip.env("PIP_CONSTRAINT", &constraints); }
    match pip.output() {
        Ok(o) if o.status.success() => InstallResult { ok: true, message: "ComfyUI environment restored to the known-good snapshot.".into() },
        Ok(o) => InstallResult { ok: false, message: format!("Restore failed: {}", String::from_utf8_lossy(&o.stderr)) },
        Err(e) => InstallResult { ok: false, message: format!("python/pip unavailable: {e}") },
    }
}

// ── One-click Modal backend deploy ───────────────────────────────────
// Shells `modal deploy` for one of the bundled scripts with the chosen
// hardware/model baked into env, optionally (re)creating the shared secret
// first, then parses the printed .modal.run URL out of the output.

#[derive(serde::Serialize)]
struct DeployResult {
    ok: bool,
    url: Option<String>,
    message: String,
    log: String,
}

// Find a modal/<file>.py script: bundled resource, next to the exe, or cwd (dev).
fn resolve_modal_script(app: &tauri::AppHandle, file: &str) -> Option<PathBuf> {
    if let Ok(res) = app.path().resource_dir() {
        for cand in [
            res.join("modal").join(file),
            res.join("resources").join("modal").join(file),
            res.join(file),               // some Tauri layouts flatten the glob
            res.join("_up_").join("modal").join(file),  // Tauri encodes ".." as _up_
        ] {
            if cand.exists() { return Some(cand); }
        }
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            let c = parent.join("modal").join(file);
            if c.exists() { return Some(c); }
        }
    }
    let c = std::env::current_dir().ok()?.join("modal").join(file);
    if c.exists() { Some(c) } else { None }
}

// Pull the first https://….modal.run URL out of `modal deploy` output.
fn scan_modal_url(s: &str) -> Option<String> {
    for token in s.split(|c: char| c.is_whitespace()) {
        let t = token.trim_matches(|c: char| !c.is_ascii_graphic());
        if t.starts_with("https://") && t.contains(".modal.run") {
            return Some(t.trim_end_matches(|c| c == ')' || c == '.' || c == ',' || c == '"' || c == '\'').to_string());
        }
    }
    None
}

// Run a `modal …` subcommand, falling back to `python -m modal` if the CLI
// isn't directly on PATH.
fn run_modal(args: &[&str], envs: &[(&str, String)]) -> std::io::Result<std::process::Output> {
    let mut c = Command::new("modal");
    c.args(args);
    for (k, v) in envs { c.env(k, v); }
    match c.output() {
        Ok(o) => Ok(o),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            let py = if cfg!(windows) { "python" } else { "python3" };
            let mut c2 = Command::new(py);
            c2.arg("-m").arg("modal").args(args);
            for (k, v) in envs { c2.env(k, v); }
            c2.output()
        }
        Err(e) => Err(e),
    }
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
fn deploy_modal_backend(
    app: tauri::AppHandle,
    modality: String,
    gpu: String,
    gpu_count: Option<u32>,
    cpu: Option<f64>,
    ram_mb: Option<u64>,
    model: String,
    secret: String,
    hf_token: String,
    modal_token_id: Option<String>,
    modal_token_secret: Option<String>,
) -> DeployResult {
    let (file, model_env) = match modality.as_str() {
        "llm" | "chat" => ("llm_vllm.py", "LLM_MODEL"),
        "image" => ("image_diffusers.py", "IMAGE_MODEL"),
        "video" => ("video_ltx.py", "VIDEO_MODEL"),
        other => return DeployResult { ok: false, url: None, message: format!("Unknown modality '{other}'"), log: String::new() },
    };
    let Some(script) = resolve_modal_script(&app, file) else {
        return DeployResult { ok: false, url: None,
            message: format!("Couldn't find modal/{file}. Run the desktop dev build from the project root, or bundle the modal/ folder as a resource."),
            log: String::new() };
    };

    // Tokens (optional — if omitted, the CLI uses ~/.modal.toml from `modal setup`).
    let mut envs: Vec<(&str, String)> = Vec::new();
    if let Some(id) = &modal_token_id { if !id.is_empty() { envs.push(("MODAL_TOKEN_ID", id.clone())); } }
    if let Some(sec) = &modal_token_secret { if !sec.is_empty() { envs.push(("MODAL_TOKEN_SECRET", sec.clone())); } }

    let mut log = String::new();

    // 1) (Re)create the shared `nexus-secret` if a NEXUS_SECRET was provided.
    if !secret.is_empty() {
        let kv_secret = format!("NEXUS_SECRET={secret}");
        let kv_hf = format!("HF_TOKEN={hf_token}");
        let mut args = vec!["secret", "create", "nexus-secret", kv_secret.as_str()];
        if !hf_token.is_empty() { args.push(kv_hf.as_str()); }
        args.push("--force");
        match run_modal(&args, &envs) {
            Ok(o) => log.push_str(&format!("[secret] {}\n{}\n", o.status, String::from_utf8_lossy(&o.stderr))),
            Err(e) => return DeployResult { ok: false, url: None,
                message: format!("`modal` CLI not available: {e}. Install it (pip install modal) and run `modal setup`."), log },
        }
    }

    // 2) Deploy with the chosen hardware + model baked into env.
    let mut deploy_envs = envs.clone();
    deploy_envs.push(("NEXUS_GPU", gpu.clone()));
    deploy_envs.push(("NEXUS_GPU_COUNT", gpu_count.unwrap_or(1).to_string()));
    deploy_envs.push(("NEXUS_CPU", cpu.unwrap_or(8.0).to_string()));
    if let Some(r) = ram_mb { deploy_envs.push(("NEXUS_RAM_MB", r.to_string())); }
    if !model.is_empty() { deploy_envs.push((model_env, model.clone())); }

    let script_str = script.to_string_lossy().to_string();
    let args = vec!["deploy", script_str.as_str()];
    match run_modal(&args, &deploy_envs) {
        Ok(o) => {
            let out = format!("{}{}", String::from_utf8_lossy(&o.stdout), String::from_utf8_lossy(&o.stderr));
            log.push_str(&out);
            if o.status.success() {
                match scan_modal_url(&out) {
                    Some(url) => DeployResult { ok: true, url: Some(url), message: "Deployed.".into(), log },
                    None => DeployResult { ok: true, url: None, message: "Deployed, but couldn't parse the URL — copy the .modal.run URL from the log.".into(), log },
                }
            } else {
                DeployResult { ok: false, url: None, message: "modal deploy failed — see log.".into(), log }
            }
        }
        Err(e) => DeployResult { ok: false, url: None,
            message: format!("`modal` CLI not available: {e}. Install it (pip install modal) and run `modal setup`."), log },
    }
}

// Stop a deployed Modal app entirely (`modal app stop <name>`) — kills its
// containers and stops all billing. The deployment is recreated by re-running
// deploy_modal_backend (the "Start" action) at the same URL.
#[tauri::command]
fn stop_modal_app(
    app_name: String,
    modal_token_id: Option<String>,
    modal_token_secret: Option<String>,
) -> DeployResult {
    let mut envs: Vec<(&str, String)> = Vec::new();
    if let Some(id) = &modal_token_id { if !id.is_empty() { envs.push(("MODAL_TOKEN_ID", id.clone())); } }
    if let Some(sec) = &modal_token_secret { if !sec.is_empty() { envs.push(("MODAL_TOKEN_SECRET", sec.clone())); } }
    match run_modal(&["app", "stop", app_name.as_str()], &envs) {
        Ok(o) => {
            let log = format!("{}{}", String::from_utf8_lossy(&o.stdout), String::from_utf8_lossy(&o.stderr));
            if o.status.success() {
                DeployResult { ok: true, url: None, message: format!("Stopped {app_name}."), log }
            } else {
                DeployResult { ok: false, url: None, message: format!("Couldn't stop {app_name} — see log."), log }
            }
        }
        Err(e) => DeployResult { ok: false, url: None,
            message: format!("`modal` CLI not available: {e}."), log: String::new() },
    }
}

#[tauri::command]
fn concat_videos(app: tauri::AppHandle, video_urls: Vec<String>) -> Result<String, String> {
    let cache_dir = app.path().app_cache_dir().map_err(|e| e.to_string())?;
    let temp_dir = cache_dir.join("cinema_temp");
    let _ = std::fs::create_dir_all(&temp_dir);

    let mut local_paths = Vec::new();
    for (i, url) in video_urls.iter().enumerate() {
        let dest = temp_dir.join(format!("scene_{}.mp4", i));
        let status = Command::new("curl")
            .arg("-L")
            .arg("-o")
            .arg(&dest)
            .arg(url)
            .status()
            .map_err(|e| format!("Failed to download video: {}", e))?;
        if !status.success() {
            return Err(format!("Failed to download video from: {}", url));
        }
        local_paths.push(dest);
    }

    let list_file = temp_dir.join("input.txt");
    let mut list_content = String::new();
    for path in &local_paths {
        let path_str = path.to_string_lossy().replace("\\", "/");
        list_content.push_str(&format!("file '{}'\n", path_str));
    }
    std::fs::write(&list_file, list_content).map_err(|e| format!("Failed to write input.txt: {}", e))?;

    let output_file = temp_dir.join("final_movie.mp4");
    if output_file.exists() {
        let _ = std::fs::remove_file(&output_file);
    }

    let status = Command::new("ffmpeg")
        .arg("-y")
        .arg("-f")
        .arg("concat")
        .arg("-safe")
        .arg("0")
        .arg("-i")
        .arg(&list_file)
        .arg("-c")
        .arg("copy")
        .arg(&output_file)
        .status()
        .map_err(|e| format!("Failed to execute ffmpeg: {}. Check that ffmpeg is installed and in PATH.", e))?;

    if !status.success() {
        return Err("ffmpeg concatenation failed. Make sure all video inputs have matching resolution and codecs.".into());
    }

    Ok(output_file.to_string_lossy().into_owned())
}

#[derive(serde::Serialize)]
struct DownloadStatus {
    file_name: String,
    current_bytes: u64,
    total_bytes: u64,
    complete: bool,
    exists: bool,
}

#[tauri::command]
fn check_model_downloads_status(app: tauri::AppHandle) -> Vec<DownloadStatus> {
    let comfy_dir = resolve_comfy_dir(&app);
    let diffusion_dir = comfy_dir.join("ComfyUI").join("models").join("diffusion_models");
    let clip_vision_dir = comfy_dir.join("ComfyUI").join("models").join("clip_vision");

    let ltx_path = diffusion_dir.join("ltx-2.3-22b-distilled-1.1_transformer_only_fp8_scaled.safetensors");
    let gguf_path = clip_vision_dir.join("Gemma4-26B-A4B-QAT-Uncensored-HauhauCS-Balanced-Q4_K_M.gguf");

    let mut list = Vec::new();

    // LTX-2.3 Video Model
    let ltx_exists = ltx_path.exists();
    let ltx_len = ltx_path.metadata().map(|m| m.len()).unwrap_or(0);
    let ltx_total = 22300000000; // estimated 22.3 GB
    list.push(DownloadStatus {
        file_name: "ltx-2.3-22b-distilled-1.1_transformer_only_fp8_scaled.safetensors".into(),
        current_bytes: ltx_len,
        total_bytes: ltx_total,
        complete: ltx_exists && ltx_len >= ltx_total - 1000000,
        exists: ltx_exists,
    });

    // Qwen/Gemma GGUF Text Model
    let gguf_exists = gguf_path.exists();
    let gguf_len = gguf_path.metadata().map(|m| m.len()).unwrap_or(0);
    let gguf_total = 16000000000; // estimated 16.0 GB
    list.push(DownloadStatus {
        file_name: "Gemma4-26B-A4B-QAT-Uncensored-HauhauCS-Balanced-Q4_K_M.gguf".into(),
        current_bytes: gguf_len,
        total_bytes: gguf_total,
        complete: gguf_exists && gguf_len >= gguf_total - 1000000,
        exists: gguf_exists,
    });

    list
}

#[tauri::command]
fn start_model_downloads(app: tauri::AppHandle) -> Result<String, String> {
    let comfy_dir = resolve_comfy_dir(&app);
    let diffusion_dir = comfy_dir.join("ComfyUI").join("models").join("diffusion_models");
    let clip_vision_dir = comfy_dir.join("ComfyUI").join("models").join("clip_vision");

    let _ = std::fs::create_dir_all(&diffusion_dir);
    let _ = std::fs::create_dir_all(&clip_vision_dir);

    // Spawn LTX-2.3 video model download in background thread
    let ltx_path = diffusion_dir.join("ltx-2.3-22b-distilled-1.1_transformer_only_fp8_scaled.safetensors");
    if !ltx_path.exists() || ltx_path.metadata().map(|m| m.len()).unwrap_or(0) < 1000000 {
        let ltx_path_clone = ltx_path.clone();
        std::thread::spawn(move || {
            let _ = Command::new("curl")
                .arg("-L")
                .arg("-o")
                .arg(&ltx_path_clone)
                .arg("https://huggingface.co/Lightricks/LTX-Video/resolve/main/ltx-2.3-22b-distilled-1.1_transformer_only_fp8_scaled.safetensors")
                .status();
        });
    }

    // Spawn Gemma GGUF model download in background thread
    let gguf_path = clip_vision_dir.join("Gemma4-26B-A4B-QAT-Uncensored-HauhauCS-Balanced-Q4_K_M.gguf");
    if !gguf_path.exists() || gguf_path.metadata().map(|m| m.len()).unwrap_or(0) < 1000000 {
        let gguf_path_clone = gguf_path.clone();
        std::thread::spawn(move || {
            let _ = Command::new("curl")
                .arg("-L")
                .arg("-o")
                .arg(&gguf_path_clone)
                .arg("https://huggingface.co/lmstudio-community/gemma-2-27b-it-GGUF/resolve/main/gemma-2-27b-it-Q4_K_M.gguf")
                .status();
        });
    }

    Ok("Downloads spawned".into())
}

fn main() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init());

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder
        .manage(ComfyProc::default())
        .invoke_handler(tauri::generate_handler![
            comfy_managed_dir,
            comfy_status,
            provision_comfyui,
            launch_comfyui,
            stop_comfyui,
            install_modal_node,
            restore_comfy_env,
            deploy_modal_backend,
            stop_modal_app,
            concat_videos,
            check_model_downloads_status,
            start_model_downloads
        ])
        .setup(|app| {
            #[cfg(desktop)]
            {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    use tauri_plugin_updater::UpdaterExt;
                    if let Ok(updater) = handle.updater() {
                        if let Ok(Some(update)) = updater.check().await {
                            let _ = update.download_and_install(|_c, _t| {}, || {}).await;
                        }
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Nexus AI Studio");
}
