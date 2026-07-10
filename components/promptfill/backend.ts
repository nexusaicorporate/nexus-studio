import { BankMap, Template, CategoryMap } from "./types";

let state: any = null;

async function fetchState() {
  if (state) return state;
  try {
    const res = await fetch('/api/promptfill');
    state = await res.json();
    if (!state.templates) state.templates = [];
    if (!state.banks) state.banks = {};
    if (!state.categories) state.categories = {};
    if (!state.history) state.history = [];
    if (!state.config) state.config = {};
    
    // Load defaults if empty
    if (state.templates.length === 0) {
      try {
        const tRes = await fetch('/data/templates.json');
        if (tRes.ok) state.templates = await tRes.json();
      } catch (e) {}
    }
    if (Object.keys(state.banks).length === 0) {
      try {
        const bRes = await fetch('/data/banks.json');
        if (bRes.ok) state.banks = await bRes.json();
      } catch (e) {}
    }
    
    return state;
  } catch (e) {
    return { templates: [], banks: {}, categories: {}, history: [], config: {} };
  }
}

async function saveState() {
  await fetch('/api/promptfill', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state)
  });
}

export async function LoadTemplates(): Promise<Template[]> {
  const s = await fetchState();
  return s.templates || [];
}

export async function EnsureTemplate(template: Template) {
  const s = await fetchState();
  const idx = s.templates.findIndex((t: any) => t.id === template.id);
  if (idx >= 0) s.templates[idx] = template;
  else s.templates.push(template);
  await saveState();
}

export async function DeleteTemplate(id: string) {
  const s = await fetchState();
  s.templates = s.templates.filter((t: any) => t.id !== id);
  await saveState();
}

export async function SetTemplateCover(id: string, url: string): Promise<string> {
  const s = await fetchState();
  const t = s.templates.find((t: any) => t.id === id);
  if (t) {
    t.cover = url;
    await saveState();
  }
  return url;
}

export async function SaveTemplates(templates: Template[]) {
  const s = await fetchState();
  s.templates = templates;
  await saveState();
}

export async function LoadBanks(): Promise<BankMap> {
  const s = await fetchState();
  return s.banks || {};
}

export async function EnsureBank(key: string, data: any) {
  const s = await fetchState();
  s.banks[key] = data;
  await saveState();
}

export async function DeleteBank(key: string) {
  const s = await fetchState();
  delete s.banks[key];
  await saveState();
}

export async function SaveBanks(banks: BankMap) {
  const s = await fetchState();
  s.banks = banks;
  await saveState();
}

export async function LoadCategories(): Promise<CategoryMap> {
  const s = await fetchState();
  return s.categories || {};
}

export async function EnsureCategory(key: string, data: any) {
  const s = await fetchState();
  s.categories[key] = data;
  await saveState();
}

export async function DeleteCategory(key: string) {
  const s = await fetchState();
  delete s.categories[key];
  await saveState();
}

export async function GetConfig() {
  const s = await fetchState();
  return s.config || {};
}

export async function SetConfig(config: any) {
  const s = await fetchState();
  s.config = { ...s.config, ...config };
  await saveState();
}

export async function LoadAIHistory() {
  const s = await fetchState();
  return s.history || [];
}

export async function DeleteAIHistoryRecord(id: string) {
  const s = await fetchState();
  s.history = s.history.filter((h: any) => h.id !== id);
  await saveState();
}

export async function DownloadImageAndSaveHistory(url: string, prompt: string, provider: string, model: string, size: string, extra: any) {
  const s = await fetchState();
  s.history.unshift({ id: Date.now().toString(), url, prompt, provider, model, size, ...extra });
  await saveState();
}

export async function GenerateImage(req: any): Promise<any> {
  // Mock image generation for now
  return { success: true, images: [{ url: "https://via.placeholder.com/512" }] };
}

export async function ReadImageFile(src: string): Promise<string> {
  return src; // Web fallback
}

export async function SaveImageFile(data: number[], filename: string) {
  console.log("Mock SaveImageFile", filename);
}

export async function SelectReferenceImages(multiple: boolean): Promise<string[]> {
  console.log("Mock SelectReferenceImages");
  return [];
}
