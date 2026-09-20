# Nexus Cloud — ComfyUI sidebar
#
# Multi-account, primary/backup failover management for Modal + Beam.
# Talks only to the /nexus-cloud/* routes of the same ComfyUI it runs in.
(() => {
    const NX_URL = '/nexus-cloud';

    const el = (tag, attrs = {}, text = '') => {
        const node = document.createElement(tag);
        for (const [k, v] of Object.entries(attrs)) {
            if (k === 'class') node.className = v;
            else if (k === 'text') node.textContent = v;
            else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
            else node.setAttribute(k, v);
        }
        if (text) node.textContent = text;
        return node;
    };

    let providerDefs = {};
    let state = { enabled: false, auto_failover: true, order: [], accounts: [] };

    class NexusCloud {
        constructor() {
            this.ui = null;
            this.rootEl = null;
        }

        async api(method, path, body) {
            const opts = { method, headers: {} };
            if (body !== undefined) {
                opts.headers['Content-Type'] = 'application/json';
                opts.body = JSON.stringify(body);
            }
            const res = await fetch(NX_URL + path, opts);
            const data = await res.json().catch(() => ({}));
            if (!res.ok && data.status !== 'ok') throw new Error(data.message || res.statusText);
            return data;
        }

        async refresh() {
            const [spec, status] = await Promise.all([
                this.api('GET', '/providers'),
                this.api('GET', '/status'),
            ]);
            providerDefs = spec.providers || {};
            state = status;
        }

        get active() { return state.active; }
        get enabled() { return state.enabled; }

        open() {
            if (this.ui) {
                this.ui.style.display = this.ui.style.display === 'none' ? 'block' : 'none';
                if (this.ui.style.display !== 'none') this.render();
            }
        }

        async panel() {
            await this.refresh();
            if (!this.rootEl) this.rootEl = el('div', { class: 'nx-root', style: 'padding:10px 14px' });
            this.rootEl.innerHTML = '';
            this.rootEl.append(
                this.header(),
                this.status(),
                this.toggleRow(),
                this.baseCard(),
                ...providerCards(),
            );
            if (!this.ui) {
                this.ui = el('div', { style: 'display:block' });
                this.ui.append(this.rootEl);
                app.ui.sidebar.addElement(this.ui, 'Nexus Cloud', 'icon:cloud');
            }
            return this.ui;
        }

        header() {
            const h = el('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px' });
            const title = el('span', { text: 'Nexus Cloud' }, 'Nexus Cloud');
            title.style.fontWeight = '600';
            const refreshBtn = el('button', { onclick: () => this.render() }, 'Refresh');
            refreshBtn.className = 'nx-btn';
            h.append(title, refreshBtn);
            return h;
        }

        status() {
            const s = document.createElement('div');
            s.className = 'nx-status';
            const active = this.active ? `${this.active.provider}/${this.active.account}` : '—';
            const running = state.accounts.find(a => a.active)?.running ? ' (live)' : '';
            s.textContent = `Active: ${active}${running} · Auto-failover: ${state.auto_failover ? 'on' : 'off'}`;
            return s;
        }

        toggleRow() {
            const row = el('div', { style: 'display:flex;gap:10px;align-items:center;margin:8px 0' });
            const label = el('label', { style: 'display:flex;align-items:center;gap:6px' },
                             'Route /prompt through Nexus Cloud');
            const on = el('input', { type: 'checkbox' });
            on.checked = state.enabled;
            on.onchange = async () => {
                try { await this.api('POST', '/toggle', { enabled: on.checked }); this.render(); }
                catch (e) { alert(e.message); }
            };
            label.prepend(on);
            row.append(label);
            return row;
        }

        baseCard() {
            const card = el('div', { class: 'nx-card' });
            const title = el('div', { class: 'nx-card-title' }, 'Providers');
            card.append(title);
            if (!Object.keys(providerDefs).length) {
                card.append(el('div', { class: 'nx-muted', text: 'No providers configured.' }, 'No providers configured.'));
                return card;
            }
            for (const [pid, def] of Object.entries(providerDefs)) {
                card.append(providerCard(pid, def));
            }
            return card;
        }
    }

    const providerCard = (pid, def) => {
        const section = el('div', { class: 'nx-provider' });
        const head = el('div', { class: 'nx-provider-head' });
        const name = el('span', { text: def.label }, def.label);
        name.style.fontWeight = '600';
        const avail = def.available ? '✓' : '✗ no SDK';
        const availTag = el('span', { class: 'nx-tag', text: avail }, avail);
        availTag.title = def.summary;
        head.append(name, availTag);
        section.append(head);
        const accounts = state.accounts.filter(a => a.provider === pid);
        if (!accounts.length) {
            section.append(el('div', { class: 'nx-muted', text: 'No accounts saved.' }, 'No accounts saved.'));
        } else {
            const list = el('div', { class: 'nx-accounts' });
            for (const a of accounts) {
                list.append(accountRow(pid, def, a));
            }
            section.append(list);
        }
        section.append(addAccountRow(pid, def));
        return section;
    };

    const accountRow = (pid, def, a) => {
        const row = el('div', { class: `nx-acct${a.active ? ' nx-active' : ''}` });
        const badge = a.primary ? '⭐' : (a.active ? '●' : '');
        const nameEl = el('span', { text: `${a.label || a.name} ${badge}`.trim() }, `${a.label || a.name} ${badge}`.trim());
        nameEl.style.flex = '1';
        const live = a.running ? el('span', { class: 'nx-tag', text: 'live' }, 'live') : null;
        const connectBtn = el('button', { class: 'nx-btn', onclick: async () => { await connect(pid, a.name); } }, 'Connect');
        const delBtn = el('button', { class: 'nx-btn nx-danger', onclick: async () => { await delAccount(pid, a.name); } }, '✕');
        row.append(nameEl);
        if (live) row.append(live);
        row.append(connectBtn, delBtn);
        return row;
    };

    const addAccountRow = (pid, def) => {
        const form = el('div', { class: 'nx-add' });
        const name = el('input', { type: 'text', placeholder: 'name e.g. "my-modal"' });
        const fields = [];
        for (const cf of def.cred_fields) {
            const inp = el('input', { type: cf.secret ? 'password' : 'text', placeholder: cf.placeholder });
            inp.dataset.key = cf.key;
            fields.push({ label: cf.label, input: inp });
        }
        const saveBtn = el('button', { class: 'nx-btn nx-primary', onclick: async () => {
            const creds = {};
            for (const f of fields) creds[f.input.dataset.key] = f.input.value.trim();
            try {
                await this0.api('POST', '/accounts', { provider: pid, account: name.value.trim(), creds });
                this0.render();
            } catch (e) { alert(e.message); }
        } }, 'Save account');

        const inner = el('div', { style: 'display:flex;flex-direction:column;gap:6px' });
        inner.append(name);
        for (const f of fields) {
            const wrap = el('div', { style: 'display:flex;flex-direction:column;gap:2px' });
            wrap.append(el('label', { class: 'nx-muted', text: f.label }, f.label), f.input);
            inner.append(wrap);
        }
        inner.append(saveBtn);
        form.append(inner);
        return form;
    };

    const connect = async (pid, acct) => {
        try {
            await this0.api('POST', '/connect', { provider: pid, account: acct });
            this0.render();
        } catch (e) { alert(e.message); }
    };
    const delAccount = async (pid, acct) => {
        if (!confirm(`Delete account ${acct}?`)) return;
        try {
            await this0.api('DELETE', '/accounts', { provider: pid, account: acct });
            this0.render();
        } catch (e) { alert(e.message); }
    };

    let this0 = null;
    const boot = async () => {
        this0 = new NexusCloud();
        window.nexusCloud = this0;
        const hasSidebar = !!app.ui.sidebar;
        if (!hasSidebar) {
            console.warn('[nexus-cloud] ComfyUI sidebar not available yet; retrying.');
            setTimeout(boot, 500);
            return;
        }
        try {
            await this0.panel();
        } catch (e) {
            console.error('[nexus-cloud] panel error', e);
        }
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(boot, 300);
    } else {
        window.addEventListener('DOMContentLoaded', () => setTimeout(boot, 300));
    }
})();