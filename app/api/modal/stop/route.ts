import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const args = await request.json();
    const { appName, modalTokenId, modalTokenSecret } = args;

    if (!appName) {
      return NextResponse.json({ ok: false, message: "Missing appName", log: "" });
    }

    let log = "";
    const env = { ...process.env };
    if (modalTokenId) env.MODAL_TOKEN_ID = modalTokenId;
    if (modalTokenSecret) env.MODAL_TOKEN_SECRET = modalTokenSecret;

    const stopCmd = `modal app stop "${appName}"`;

    try {
      const { stdout, stderr } = await execAsync(stopCmd, { env });
      log += `${stdout}\n${stderr}\n`;
      return NextResponse.json({ ok: true, message: `Stopped ${appName}.`, log });
    } catch (e: any) {
      log += e.message || String(e);
      return NextResponse.json({ ok: false, message: `Couldn't stop ${appName} — see log.`, log });
    }

  } catch (error: any) {
    return NextResponse.json({ ok: false, message: error?.message || String(error), log: "" });
  }
}
