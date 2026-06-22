// Run the optional comfyui-mcp-server (MCP control layer over ComfyUI).
// It wraps a RUNNING ComfyUI (:8188) and exposes generate/run_workflow/etc. as
// MCP tools over streamable-http on http://127.0.0.1:9000/mcp.
//
//   1) start ComfyUI first  (npm run comfyui, or the desktop app's Start)
//   2) npm run comfyui:mcp
//
// Then point an MCP client at http://127.0.0.1:9000/mcp.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const root = path.resolve("src-tauri/resources");
const toolDir = path.join(root, "comfyui-mcp-server");
const server = path.join(toolDir, "server.py");
// Prefer the bundled ComfyUI Python (deps installed there by prepare); fall back to system python.
const bundledPy = path.join(root, "comfyui", "python_embeded", "python.exe");
const py = existsSync(bundledPy) ? bundledPy : (process.platform === "win32" ? "python" : "python3");

if (!existsSync(server)) {
  console.error(
    "comfyui-mcp-server not found at src-tauri/resources/comfyui-mcp-server.\n" +
    "Run `npm run prepare:comfyui` first to fetch it."
  );
  process.exit(1);
}

console.log("Starting comfyui-mcp-server on http://127.0.0.1:9000/mcp");
console.log("(Make sure ComfyUI is already running on :8188.)\n");

const child = spawn(py, [server, ...process.argv.slice(2)], { cwd: toolDir, stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
