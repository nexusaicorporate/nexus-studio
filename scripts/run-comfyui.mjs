import { spawn } from "node:child_process";
import { existsSync, appendFileSync } from "node:fs";
import path from "node:path";
import http from "node:http";

const root = path.resolve("src-tauri/resources/comfyui");
const py = path.join(root, "python_embeded", "python.exe");
const mainPy = path.join(root, "ComfyUI", "main.py");
const logFile = path.resolve("comfy-monitor.log");

function logEvent(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  appendFileSync(logFile, line + "\n");
}

if (!existsSync(py) || !existsSync(mainPy)) {
  logEvent("Bundled ComfyUI not found at src-tauri/resources/comfyui. Run `npm run prepare:comfyui` first.");
  process.exit(1);
}

const args = [
  "-s", mainPy,
  "--cpu",
  "--enable-cors-header",
  "--listen", "127.0.0.1",
  "--port", "8188",
  ...process.argv.slice(2),
];

let childProcess = null;
let consecutiveFailures = 0;
let healthCheckTimer = null;
let isRestarting = false;

function startComfyUI() {
  if (isRestarting) return;
  
  logEvent("Starting ComfyUI (CPU, CORS enabled) on http://localhost:8188 ...");
  logEvent("Leave this running, then open the ComfyUI gear and click Connect.");
  
  childProcess = spawn(py, args, { cwd: path.join(root, "ComfyUI"), stdio: "inherit" });
  
  childProcess.on("exit", (code, signal) => {
    logEvent(`ComfyUI process exited with code ${code} and signal ${signal}`);
    childProcess = null;
    triggerRestart();
  });
  
  childProcess.on("error", (err) => {
    logEvent(`ComfyUI process error: ${err.message}`);
    childProcess = null;
    triggerRestart();
  });

  // Start health checking
  consecutiveFailures = 0;
  if (healthCheckTimer) clearInterval(healthCheckTimer);
  healthCheckTimer = setInterval(checkHealth, 10000);
}

function triggerRestart() {
  if (isRestarting) return;
  isRestarting = true;
  if (healthCheckTimer) clearInterval(healthCheckTimer);
  
  logEvent("Waiting 3 seconds before restarting ComfyUI...");
  setTimeout(() => {
    isRestarting = false;
    startComfyUI();
  }, 3000);
}

function checkHealth() {
  const req = http.get("http://127.0.0.1:8188/system_stats", { timeout: 5000 }, (res) => {
    if (res.statusCode === 200) {
      consecutiveFailures = 0; // reset
    } else {
      consecutiveFailures++;
      logEvent(`Health check failed with status code: ${res.statusCode} (${consecutiveFailures}/3)`);
    }
    // Consume response data to free up memory
    res.resume();
  });

  req.on("error", (err) => {
    consecutiveFailures++;
    logEvent(`Health check network error: ${err.message} (${consecutiveFailures}/3)`);
  });
  
  req.on("timeout", () => {
    req.destroy();
    consecutiveFailures++;
    logEvent(`Health check timed out (${consecutiveFailures}/3)`);
  });

  if (consecutiveFailures >= 3) {
    logEvent("ComfyUI appears to be frozen (failed 3 health checks in a row). Forcing restart.");
    if (childProcess) {
      try {
        childProcess.kill("SIGKILL");
      } catch (e) {
        logEvent(`Failed to kill process: ${e.message}`);
      }
    } else {
      triggerRestart();
    }
  }
}

// Start the daemon
startComfyUI();
