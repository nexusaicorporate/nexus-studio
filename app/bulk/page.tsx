"use client";
import { useState } from "react";
import Page from "@/components/Page";
import { Toggle, useMounted, copy } from "@/components/ui";
import PromptPicker, { useTaskSystemPrompt } from "@/components/PromptPicker";
import { useSettings } from "@/lib/store/settings";
import { chat } from "@/lib/providers";
import { Upload, Sparkles, RefreshCw, Download, Copy, FileText, Trash2, Image as ImageIcon, Film } from "lucide-react";

interface Row { file: File; name: string; isVideo: boolean; dataUrl?: string; result?: string; error?: string; status: "idle" | "running" | "done" | "error"; }

function baseName(n: string) { return n.replace(/\.[^.]+$/, ""); }
function downloadText(name: string, text: string) {
  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
}
function readDataUrl(f: File): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(f); });
}

export default function BulkAnalyzePage() {
  const mounted = useMounted();
  const settings = useSettings();
  const taskSystem = useTaskSystemPrompt("bulk", "I2T");
  const [rows, setRows] = useState<Row[]>([]);
  const [saveTxt, setSaveTxt] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  function addFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const next: Row[] = files.map((f) => ({ file: f, name: f.name, isVideo: f.type.startsWith("video"), status: "idle" }));
    setRows((r) => [...r, ...next]);
    e.target.value = "";
  }
  function clear() { setRows([]); setProgress(0); }

  async function analyzeAll() {
    if (!rows.length) return;
    setBusy(true); setProgress(0);
    const model = "Nexus Cloud";
    const updated = [...rows];
    for (let i = 0; i < updated.length; i++) {
      const row = updated[i];
      updated[i] = { ...row, status: "running" }; setRows([...updated]);
      try {
        const dataUrl = row.dataUrl || (await readDataUrl(row.file));
        const out = await chat({ model, system: taskSystem, uncensored: settings.uncensored,
          messages: [{ id: "1", role: "user", content: "Analyze this and write a prompt/caption.", images: [dataUrl] }] });
        updated[i] = { ...row, dataUrl, result: out, status: "done" };
        if (saveTxt && out) downloadText(baseName(row.name) + ".txt", out);
      } catch (e: any) {
        updated[i] = { ...row, status: "error", error: e.message };
      }
      setRows([...updated]); setProgress(Math.round(((i + 1) / updated.length) * 100));
    }
    setBusy(false);
  }
  function downloadAll() {
    const combined = rows.filter((r) => r.result).map((r) => `### ${r.name}\n${r.result}\n`).join("\n");
    if (combined) downloadText("bulk-prompts.txt", combined);
  }

  if (!mounted) return null;
  const done = rows.filter((r) => r.status === "done").length;

  return (
    <Page title="Bulk Analyze" subtitle="Select multiple images or videos, pick the prompt to use, and generate a caption for each. A .txt is saved next to each file."
      actions={<>
        <PromptPicker taskKey="bulk" label="Analysis prompt" />
        {rows.length > 0 && <button className="btn-outline" onClick={downloadAll}><Download size={15} /> Download all</button>}
        {rows.length > 0 && <button className="btn-outline text-rose-400" onClick={clear}><Trash2 size={15} /> Clear</button>}
      </>}>
      <div className="card p-4 mb-4 space-y-3">
        <label className="flex items-center justify-between rounded-xl border border-dashed border-border px-4 py-4 cursor-pointer hover:bg-surface2">
          <span className="flex items-center gap-2 text-sm text-muted"><Upload size={16} /> Select images or videos…</span>
          <span className="btn-outline px-3 py-1.5 text-sm">Browse</span>
          <input type="file" accept="image/*,video/*" multiple hidden onChange={addFiles} />
        </label>
        <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
          <div className="flex items-center gap-2"><FileText size={16} className="text-primary" /><div><div className="text-sm">Save prompts to text file</div><div className="text-[11px] text-muted">Downloads a .txt named after each file</div></div></div>
          <Toggle checked={saveTxt} onChange={setSaveTxt} />
        </div>
        <button className="btn-primary w-full" onClick={analyzeAll} disabled={busy || rows.length === 0}>
          {busy ? <><RefreshCw size={16} className="animate-spin" /> Analyzing… {progress}%</> : <><Sparkles size={16} /> Analyze All ({rows.length})</>}
        </button>
        {rows.length > 0 && <div className="text-xs text-muted text-center">{done}/{rows.length} done · backend: Nexus Cloud</div>}
      </div>

      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="card p-3 flex gap-3">
            <div className="w-20 h-20 rounded-lg bg-surface2 overflow-hidden grid place-items-center shrink-0">
              {r.dataUrl && !r.isVideo ? <img src={r.dataUrl} className="w-full h-full object-cover" alt="" /> : r.isVideo ? <Film className="text-muted" /> : <ImageIcon className="text-muted" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium truncate">{r.name}</div>
                <span className="text-[11px] text-muted shrink-0">{r.status === "running" ? "analyzing…" : r.status === "done" ? "done" : r.status === "error" ? "error" : "queued"}</span>
              </div>
              {r.result && <p className="text-xs text-muted mt-1 line-clamp-3 whitespace-pre-wrap">{r.result}</p>}
              {r.error && <p className="text-xs text-rose-400 mt-1">{r.error}</p>}
              {r.result && (
                <div className="flex gap-1.5 mt-2">
                  <button className="btn-ghost px-2 py-1 text-xs" onClick={() => copy(r.result!)}><Copy size={12} /> Copy</button>
                  <button className="btn-ghost px-2 py-1 text-xs" onClick={() => downloadText(baseName(r.name) + ".txt", r.result!)}><Download size={12} /> .txt</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted mt-4">Note: videos analyze only on vision-capable backends. In the desktop build, a future update can write the .txt directly into the source folder; the web build downloads them.</p>
    </Page>
  );
}
