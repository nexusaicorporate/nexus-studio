import type { Bank } from "@/lib/types";

export interface PFCategory { id: string; label: string; color: string; }
export const PF_CATEGORIES: PFCategory[] = [
  { id: "character", label: "Character", color: "blue" },
  { id: "item", label: "Item", color: "amber" },
  { id: "action", label: "Action", color: "rose" },
  { id: "location", label: "Location", color: "emerald" },
  { id: "visual", label: "Visuals", color: "violet" },
  { id: "other", label: "Other", color: "slate" },
];

// Tailwind chip classes per category color (kept literal so Tailwind keeps them).
export function chipClasses(color?: string): string {
  switch (color) {
    case "blue": return "bg-sky-500/20 text-sky-300 border border-sky-500/40";
    case "amber": return "bg-amber-500/20 text-amber-300 border border-amber-500/40";
    case "rose": return "bg-rose-500/20 text-rose-300 border border-rose-500/40";
    case "emerald": return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40";
    case "violet": return "bg-violet-500/20 text-violet-300 border border-violet-500/40";
    default: return "bg-slate-500/20 text-slate-300 border border-slate-500/40";
  }
}
export function catColor(catId?: string): string {
  return PF_CATEGORIES.find((c) => c.id === catId)?.color || "slate";
}

const TOKEN_RE = /\{\{\s*([^:}]+?)\s*(?::\s*([^}]*))?\}\}/g;

export interface Seg {
  kind: "text" | "var";
  text?: string;     // for text segments
  token?: string;    // var id
  def?: string;      // inline default text
}

// Split a template content string into ordered text/variable segments.
export function parseTemplate(content: string): Seg[] {
  const segs: Seg[] = [];
  let last = 0;
  content.replace(TOKEN_RE, (m, id: string, def: string | undefined, offset: number) => {
    if (offset > last) segs.push({ kind: "text", text: content.slice(last, offset) });
    segs.push({ kind: "var", token: id.trim(), def: def ? def.trim() : undefined });
    last = offset + m.length;
    return m;
  });
  if (last < content.length) segs.push({ kind: "text", text: content.slice(last) });
  return segs;
}

// Unique variable tokens in order of appearance.
export function templateTokens(content: string): { token: string; def?: string }[] {
  const seen = new Set<string>();
  const out: { token: string; def?: string }[] = [];
  for (const s of parseTemplate(content)) {
    if (s.kind === "var" && s.token && !seen.has(s.token)) { seen.add(s.token); out.push({ token: s.token, def: s.def }); }
  }
  return out;
}

// Options available for a token: bank options first, then inline default.
export function tokenOptions(token: string, def: string | undefined, banks: Bank[]): string[] {
  const bank = banks.find((b) => b.id === token);
  const opts = bank ? [...bank.options] : [];
  if (def && !opts.includes(def)) opts.unshift(def);
  return opts;
}

// Resolve the final prompt text from selections (falling back to default / first bank option / token id).
export function assembleTemplate(content: string, selections: Record<string, string>, banks: Bank[]): string {
  return content.replace(TOKEN_RE, (_m, id: string, def: string | undefined) => {
    const t = id.trim();
    if (selections[t]) return selections[t];
    if (def) return def.trim();
    const bank = banks.find((b) => b.id === t);
    return bank?.options[0] || t.replace(/_/g, " ");
  });
}

// Pretty label for a token id (snake_case -> Title Case), or the bank's name if linked.
export function tokenLabel(token: string, banks: Bank[]): string {
  const bank = banks.find((b) => b.id === token);
  if (bank) return bank.name;
  return token.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
