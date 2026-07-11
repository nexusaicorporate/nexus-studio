import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

// Check if we are already running by pinging the stats endpoint
async function checkComfyReachable(timeoutMs = 2000): Promise<boolean> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`http://127.0.0.1:8188/system_stats`, { signal: ctrl.signal });
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

export async function POST(req: Request) {
  try {
    const isUp = await checkComfyReachable();
    if (isUp) {
      return NextResponse.json({ ok: true, message: "ComfyUI is already running." });
    }

    // Spawn the daemon monitor in detached mode so it survives API request
    const scriptPath = path.resolve(process.cwd(), "scripts", "run-comfyui.mjs");
    const child = spawn("node", [scriptPath], {
      detached: true,
      stdio: 'ignore'
    });
    
    // Unref so the parent can exit independently of the child
    child.unref();

    return NextResponse.json({ ok: true, message: "ComfyUI daemon triggered successfully." });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
