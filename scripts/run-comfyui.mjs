// Run the bundled ComfyUI as a standalone process so the BROWSER dev build
// (`npm run dev`) can connect to it. The browser can't launch a local process
// itself, so start ComfyUI here, then open the ComfyUI gear and click Connect.
//
//   npm run comfyui            # CPU, CORS enabled, http://localhost:8188
//   npm run comfyui -- --highvram   # pass extra ComfyUI flags after `--`
//
// (In the desktop app this is automatic — the Start button launches it.)
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve("src-tauri/resources/comfyui");
const isWin = process.platform === "win32";
const py = isWin
  ? path.join(root, "python_embeded", "python.exe")
  : path.join(root, "venv", "bin", "python");
const mainPy = path.join(root, "ComfyUI", "main.py");

if (!existsSync(py) || !existsSync(mainPy)) {
  console.error(
    "Bundled ComfyUI not found at src-tauri/resources/comfyui.\n" +
    "Run `bash scripts/setup_comfyui_linux.sh` on Linux first to set up, or `npm run prepare:comfyui` on Windows."
  );
  process.exit(1);
}

// --enable-cors-header lets the web app (localhost:3000) talk to ComfyUI (8188).
const args = [
  "-s", mainPy,
  "--cpu",
  "--enable-cors-header",
  "--listen", "127.0.0.1",
  "--port", "8188",
  ...process.argv.slice(2),
];

console.log("Starting ComfyUI (CPU, CORS enabled) on http://localhost:8188 ...");
console.log("Leave this running, then open the ComfyUI gear and click Connect.\n");

const child = spawn(py, args, { cwd: path.join(root, "ComfyUI"), stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
