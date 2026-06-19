// Nexus Cloud — ComfyUI sidebar extension
//
// One panel, a provider dropdown. Pick a provider → its credential fields and
// GPU options render dynamically → set a GPU profile → Connect & Deploy →
// ON/OFF toggle → live status. Talks only to /nexus-cloud/* on the local server.
//
// Creds are kept in localStorage per provider (never sent anywhere but the
// local ComfyUI server, which forwards to the provider you chose).
import { app } from "../../scripts/app.js";

const LS_KEY = "nexus-cloud.creds";        // { [providerId]: {field:value} }
const LS_PROFILE = "nexus-cloud.profile";  // { provider, gpu, gpu_count, cpu, ram_gb, volume_gb }

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch { return fallback; }
}
function saveJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

async function api(path, method = "GET", body) {
  const opt = { method, headers: { "Content-Type": "application/json" } };
  if (body) opt.body = JSON.stringify(body);
  const r = await fetch(path, opt);
  return r.json();
}

function el(tag, props = {}, children = []) {
  const e = document.createElement(tag);
  Object.assign(e, props);
  if (props.style) e.setAttribute("style", props.style);
  for (const c of [].concat(children)) e.append(c);
  return e;
}

class NexusCloudPanel {
  constructor(root) {
    this.root = root;
    this.specs = [];
    this.creds = loadJSON(LS_KEY, {});
    this.profile = loadJSON(LS_PROFILE, {});
    this.active = this.profile.provider || "modal";
    this.render();
    this.refresh();
  }

  async refresh() {
    const data = await api("/nexus-cloud/providers");
    if (data.ok) {
      this.specs = data.providers;
      if (data.active) this.active = data.active;
      this.render();
      this.pollStatus();
    }
  }

  spec() { return this.specs.find((s) => s.id === this.active); }

  setActive(id) {
    this.active = id;
    this.profile.provider = id;
    saveJSON(LS_PROFILE, this.profile);
    this.render();
  }

  credFor(field) {
    return (this.creds[this.active] || {})[field.key] || "";
  }
  setCred(field, value) {
    this.creds[this.active] = this.creds[this.active] || {};
    this.creds[this.active][field.key] = value;
    saveJSON(LS_KEY, this.creds);
  }

  async connect() {
    const sp = this.spec();
    if (!sp) return;
    if (!sp.implemented) {
      this.setStatus(`${sp.label} isn't wired up yet — pick Modal for now.`, true);
      return;
    }
    this.setStatus("Connecting…");
    const res = await api("/nexus-cloud/connect", "POST", {
      provider: this.active,
      creds: this.creds[this.active] || {},
    });
    if (!res.ok) return this.setStatus(res.error, true);
    this.setStatus("Connected. Deploying GPU…");
    await this.deploy();
  }

  async deploy() {
    const p = this.profile;
    const res = await api("/nexus-cloud/deploy", "POST", {
      gpu: p.gpu, gpu_count: p.gpu_count || 1, cpu: p.cpu,
      ram_gb: p.ram_gb, volume_gb: p.volume_gb,
    });
    if (!res.ok) return this.setStatus(res.error, true);
    this.setStatus(`Endpoint live: ${res.endpoint}`);
    this.pollStatus();
  }

  async toggle(on) {
    await api("/nexus-cloud/toggle", "POST", { enabled: on });
    this.pollStatus();
  }

  async stop() {
    await api("/nexus-cloud/stop", "POST", {});
    this.setStatus("Stopped (scaled to zero). Volume kept.");
  }

  async pollStatus() {
    const s = await api("/nexus-cloud/status");
    if (s.ok && this.statusBox) {
      const st = s.status || {};
      const lines = [
        st.running ? "● Running" : "○ Idle",
        st.gpu ? `GPU: ${st.gpu}` : "",
        st.uptime_s ? `Up: ${st.uptime_s}s` : "",
        st.est_cost_usd != null ? `Est: $${st.est_cost_usd}` : "",
        st.volume_used_gb != null ? `Vol: ${st.volume_used_gb} GB` : "",
        st.message || "",
      ].filter(Boolean);
      this.statusBox.textContent = lines.join("   ");
    }
  }

  setStatus(msg, isErr = false) {
    if (this.msgBox) {
      this.msgBox.textContent = msg;
      this.msgBox.style.color = isErr ? "#ff6b6b" : "var(--fg-color, #ddd)";
    }
  }

  render() {
    const r = this.root;
    r.innerHTML = "";
    const sp = this.spec();

    r.append(el("div", {
      textContent: "Nexus Cloud",
      style: "font-weight:700;font-size:14px;margin:8px 0;",
    }));

    // Provider dropdown
    const sel = el("select", {
      style: "width:100%;padding:6px;margin-bottom:8px;",
      onchange: (e) => this.setActive(e.target.value),
    });
    for (const s of this.specs) {
      sel.append(el("option", {
        value: s.id,
        textContent: s.implemented ? s.label : `${s.label} (soon)`,
        selected: s.id === this.active,
      }));
    }
    r.append(sel);

    if (!sp) { r.append(el("div", { textContent: "Loading providers…" })); return; }

    // Summary + storage warning
    r.append(el("div", {
      textContent: sp.summary,
      style: "font-size:11px;opacity:.75;margin-bottom:6px;",
    }));
    if (!sp.persistent_storage) {
      r.append(el("div", {
        textContent: "⚠ Storage is ephemeral on this provider — models may need re-download.",
        style: "font-size:11px;color:#ffb84d;margin-bottom:6px;",
      }));
    }

    // Credential fields
    for (const f of sp.cred_fields) {
      r.append(el("label", {
        textContent: f.label,
        style: "display:block;font-size:11px;margin-top:6px;",
      }));
      const inp = el("input", {
        type: f.secret ? "password" : "text",
        value: this.credFor(f),
        placeholder: f.placeholder || "",
        style: "width:100%;padding:5px;",
        oninput: (e) => this.setCred(f, e.target.value),
      });
      r.append(inp);
      if (f.help) r.append(el("div", {
        textContent: f.help, style: "font-size:10px;opacity:.6;",
      }));
    }

    // GPU profile
    r.append(el("label", { textContent: "GPU", style: "display:block;font-size:11px;margin-top:10px;" }));
    const gpuSel = el("select", {
      style: "width:100%;padding:6px;",
      onchange: (e) => { this.profile.gpu = e.target.value; saveJSON(LS_PROFILE, this.profile); },
    });
    const curGpu = this.profile.gpu || sp.default_gpu;
    for (const g of sp.gpu_options) {
      const cost = g.usd_per_hr != null ? ` · ~$${g.usd_per_hr}/hr` : "";
      gpuSel.append(el("option", {
        value: g.id, textContent: `${g.label}${cost}`, selected: g.id === curGpu,
      }));
    }
    this.profile.gpu = curGpu;
    r.append(gpuSel);

    // CPU / RAM / Volume
    const grid = el("div", { style: "display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:8px;" });
    const num = (label, key, def) => {
      const wrap = el("div");
      wrap.append(el("label", { textContent: label, style: "font-size:10px;display:block;" }));
      wrap.append(el("input", {
        type: "number", value: this.profile[key] ?? def, style: "width:100%;padding:4px;",
        oninput: (e) => { this.profile[key] = +e.target.value; saveJSON(LS_PROFILE, this.profile); },
      }));
      return wrap;
    };
    grid.append(num("CPU", "cpu", sp.default_cpu));
    grid.append(num("RAM GB", "ram_gb", sp.default_ram_gb));
    grid.append(num("Vol GB", "volume_gb", sp.default_volume_gb));
    r.append(grid);

    // Actions
    const btnRow = el("div", { style: "display:flex;gap:6px;margin-top:10px;" });
    btnRow.append(el("button", {
      textContent: "Connect & Deploy",
      style: "flex:1;padding:7px;cursor:pointer;",
      disabled: !sp.implemented,
      onclick: () => this.connect(),
    }));
    btnRow.append(el("button", {
      textContent: "Stop", style: "padding:7px;cursor:pointer;",
      onclick: () => this.stop(),
    }));
    r.append(btnRow);

    // ON/OFF
    const toggleRow = el("label", { style: "display:flex;align-items:center;gap:6px;margin-top:10px;font-size:12px;" });
    const chk = el("input", { type: "checkbox", onchange: (e) => this.toggle(e.target.checked) });
    toggleRow.append(chk);
    toggleRow.append(el("span", { textContent: "Route workflows to this provider (ON/OFF)" }));
    r.append(toggleRow);

    // Status + message
    this.statusBox = el("div", { style: "font-size:11px;margin-top:10px;opacity:.85;white-space:pre-wrap;" });
    this.msgBox = el("div", { style: "font-size:11px;margin-top:6px;min-height:16px;" });
    r.append(this.statusBox, this.msgBox);

    if (sp.docs_url) r.append(el("a", {
      textContent: "Provider docs ↗", href: sp.docs_url, target: "_blank",
      style: "font-size:10px;opacity:.6;display:block;margin-top:8px;",
    }));
  }
}

app.registerExtension({
  name: "NexusCloud.Sidebar",
  async setup() {
    // Prefer the modern sidebar tab API; fall back to a floating panel.
    const mount = (root) => new NexusCloudPanel(root);
    if (app.extensionManager?.registerSidebarTab) {
      app.extensionManager.registerSidebarTab({
        id: "nexus-cloud",
        icon: "pi pi-cloud",
        title: "Nexus Cloud",
        tooltip: "Cloud GPU provider for workflows",
        type: "custom",
        render: (e) => mount(e),
      });
    } else {
      const panel = el("div", {
        style: "position:fixed;top:60px;right:12px;width:280px;max-height:80vh;overflow:auto;" +
               "background:var(--comfy-menu-bg,#222);color:var(--fg-color,#ddd);" +
               "border:1px solid #444;border-radius:8px;padding:10px;z-index:1000;",
      });
      document.body.append(panel);
      mount(panel);
    }
  },
});
