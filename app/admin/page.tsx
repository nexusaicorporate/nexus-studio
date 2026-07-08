"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { ShieldAlert, Users, Database, ArrowRightLeft, Plus, Trash2, RefreshCw } from "lucide-react";

interface UserRecord {
  id: string;
  email: string;
  plan: string;
  groups: string[];
  createdAt: string;
}

const ALL_GROUPS = ["admin", "dev", "studio-plan", "pro-plan", "nsfw-plan"];
const ALL_PLANS = ["free", "studio", "pro"];

export default function AdminPage() {
  const { groups, ready } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // New user form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPlan, setNewPlan] = useState("free");
  const [newGroups, setNewGroups] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  // Migration tool
  const [sourceId, setSourceId] = useState("");
  const [destId, setDestId] = useState("");
  const [migrationStatus, setMigrationStatus] = useState("");
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    if (ready && !groups.includes("admin")) router.push("/");
  }, [ready, groups, router]);

  async function loadUsers() {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    if (groups.includes("admin")) loadUsers();
  }, [groups]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail, password: newPassword, plan: newPlan, userGroups: newGroups }),
    });
    setCreating(false);
    if (res.ok) {
      setNewEmail(""); setNewPassword(""); setNewPlan("free"); setNewGroups([]);
      loadUsers();
    }
  }

  async function deleteUser(id: string, email: string) {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
    await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadUsers();
  }

  async function updateGroups(id: string, userGroups: string[]) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, userGroups }),
    });
    loadUsers();
  }

  async function handleMigrate(e: React.FormEvent) {
    e.preventDefault();
    setMigrating(true); setMigrationStatus("");
    const res = await fetch("/api/admin/migrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId, destId }),
    });
    const data = await res.json();
    setMigrating(false);
    if (res.ok) {
      const { migrated } = data;
      setMigrationStatus(`✅ Migrated: ${migrated.prompts} prompts, ${migrated.templates} templates, ${migrated.banks} banks, ${migrated.ingredients} ingredients`);
      setSourceId(""); setDestId("");
    } else {
      setMigrationStatus(`❌ ${data.error}`);
    }
  }

  if (!ready || !groups.includes("admin")) return null;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-red-500" />
          <h1 className="text-3xl font-bold tracking-tight">Admin Control Panel</h1>
        </div>
        <button onClick={loadUsers} className="btn-ghost flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* User Directory */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-semibold">Users ({users.length})</h2>
          </div>

          {loading ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {users.map((user) => (
                <div key={user.id} className="p-3 bg-white/5 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{user.email}</p>
                      <p className="font-mono text-xs text-muted mt-0.5 truncate">{user.id}</p>
                    </div>
                    <button onClick={() => deleteUser(user.id, user.email)} className="text-red-400 hover:text-red-300 flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs">plan: {user.plan}</span>
                    {ALL_GROUPS.map((g) => (
                      <button
                        key={g}
                        onClick={() => {
                          const has = user.groups.includes(g);
                          updateGroups(user.id, has ? user.groups.filter(x => x !== g) : [...user.groups, g]);
                        }}
                        className={`px-2 py-0.5 rounded-full text-xs transition-colors ${
                          user.groups.includes(g)
                            ? "bg-blue-500/30 text-blue-300 border border-blue-500/50"
                            : "bg-white/5 text-white/40 border border-white/10 hover:border-white/30"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add User Form */}
          <div className="border-t border-white/10 pt-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Plus className="w-4 h-4" /> Add User</h3>
            <form onSubmit={createUser} className="space-y-2">
              <input className="input w-full text-sm" type="email" placeholder="Email" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
              <input className="input w-full text-sm" type="password" placeholder="Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} />
              <select className="input w-full text-sm" value={newPlan} onChange={e => setNewPlan(e.target.value)}>
                {ALL_PLANS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <div className="flex flex-wrap gap-1">
                {ALL_GROUPS.map(g => (
                  <button type="button" key={g} onClick={() => setNewGroups(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}
                    className={`px-2 py-0.5 rounded-full text-xs transition-colors ${newGroups.includes(g) ? "bg-blue-500/30 text-blue-300 border border-blue-500/50" : "bg-white/5 text-white/40 border border-white/10"}`}>
                    {g}
                  </button>
                ))}
              </div>
              <button type="submit" disabled={creating} className="btn-primary w-full text-sm">
                {creating ? "Creating..." : "Create User"}
              </button>
            </form>
          </div>
        </div>

        {/* Data Migration Tool */}
        <div className="card p-6 space-y-4 h-fit">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-semibold">Data Migration Tool</h2>
          </div>
          <p className="text-sm text-muted">
            Transfer all Library data (Prompts, Templates, Banks, Ingredients) from a corrupted profile to a new one. Copy the User ID from the directory above.
          </p>

          <form onSubmit={handleMigrate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Source User ID (Corrupted Account)</label>
              <input type="text" value={sourceId} onChange={e => setSourceId(e.target.value)}
                className="input w-full text-sm font-mono" placeholder="User ID..." required />
            </div>
            <div className="flex justify-center">
              <ArrowRightLeft className="w-5 h-5 text-muted" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Destination User ID (New Account)</label>
              <input type="text" value={destId} onChange={e => setDestId(e.target.value)}
                className="input w-full text-sm font-mono" placeholder="User ID..." required />
            </div>
            <button type="submit" disabled={migrating}
              className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors text-sm">
              {migrating ? "Migrating..." : "Execute Migration"}
            </button>
            {migrationStatus && <p className="text-sm text-center font-medium">{migrationStatus}</p>}
          </form>
        </div>

      </div>
    </div>
  );
}
