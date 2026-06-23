import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const args = await request.json();
    const { modality, gpu, gpuCount, cpu, ramMb, model, secret, hfToken, modalTokenId, modalTokenSecret } = args;

    // Determine the python script to run
    let file = "";
    let modelEnv = "";
    if (modality === "llm" || modality === "chat") { file = "llm_vllm.py"; modelEnv = "LLM_MODEL"; }
    else if (modality === "image") { file = "image_diffusers.py"; modelEnv = "IMAGE_MODEL"; }
    else if (modality === "video") { file = "video_ltx.py"; modelEnv = "VIDEO_MODEL"; }
    else { return NextResponse.json({ ok: false, message: `Unknown modality '${modality}'`, log: "" }); }

    // Resolve the script path (assumes there is a modal/ directory in the project root)
    const scriptPath = path.join(process.cwd(), 'modal', file);

    let log = "";
    const env = { ...process.env };
    if (modalTokenId) env.MODAL_TOKEN_ID = modalTokenId;
    if (modalTokenSecret) env.MODAL_TOKEN_SECRET = modalTokenSecret;

    // 1) Recreate the shared nexus-secret
    if (secret) {
      let secretCmd = `modal secret create nexus-secret "NEXUS_SECRET=${secret}"`;
      if (hfToken) secretCmd += ` "HF_TOKEN=${hfToken}"`;
      secretCmd += " --force";

      try {
        const { stdout, stderr } = await execAsync(secretCmd, { env });
        log += `[secret] ${stdout}\n${stderr}\n`;
      } catch (e: any) {
        log += e.message || String(e);
        return NextResponse.json({ ok: false, message: `modal CLI not available or secret creation failed. Is modal installed?`, log });
      }
    }

    // 2) Deploy the modal app
    let deployCmd = `modal deploy "${scriptPath}"`;
    const deployEnv: NodeJS.ProcessEnv = { ...env };
    if (model) deployEnv[modelEnv] = model;
    if (gpu) deployEnv.GPU_CONFIG = gpu;
    if (gpuCount) deployEnv.GPU_COUNT = String(gpuCount);
    if (cpu) deployEnv.CPU_CORES = String(cpu);
    if (ramMb) deployEnv.RAM_MB = String(ramMb);

    try {
      const { stdout, stderr } = await execAsync(deployCmd, { env: deployEnv });
      log += `[deploy]\n${stdout}\n${stderr}\n`;

      // Extract the URL from stdout
      // Typical modal output: "Created ... => https://username--appname-functionname.modal.run"
      const urlMatch = stdout.match(/=>\s*(https:\/\/[^\s]+)/);
      if (urlMatch && urlMatch[1]) {
        return NextResponse.json({ ok: true, url: urlMatch[1], message: "Deployed successfully.", log });
      } else {
        return NextResponse.json({ ok: false, message: "Deployed but couldn't parse the URL from modal output.", log });
      }
    } catch (e: any) {
      log += e.message || String(e);
      return NextResponse.json({ ok: false, message: "Deploy command failed.", log });
    }

  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error?.message || String(error), log: "" });
  }
}
