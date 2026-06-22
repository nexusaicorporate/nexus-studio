"use client";
import { useState } from "react";
import { WEB_MODE } from "@/lib/webmode";
import { useAuth } from "@/components/AuthProvider";
import { Loader2, LogOut, Lock } from "lucide-react";

// Gates the app content on the WEB build only. Desktop (WEB_MODE=false) and any
// build without Supabase configured render children unchanged.
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, configured, user, signOut } = useAuth();

  // Desktop build, or web build without Supabase env yet: behave like today.
  if (!WEB_MODE || !configured) return <>{children}</>;

  if (!ready) {
    return (
      <div className="grid place-items-center py-24 text-muted">
        <Loader2 className="animate-spin mb-2" /> Loading your account…
      </div>
    );
  }

  if (!user) return <LoginPanel />;

  return (
    <div>
      <div className="flex items-center justify-end gap-3 text-xs text-muted px-1 mb-2">
        <span>Signed in as <span className="text-text font-medium">{user.email}</span></span>
        <button className="btn-ghost text-xs inline-flex items-center gap-1" onClick={() => signOut()}>
          <LogOut size={13} /> Sign out
        </button>
      </div>
      {children}
    </div>
  );
}

function LoginPanel() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const r = mode === "in" ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (r.error) setMsg({ ok: false, text: r.error });
    else if (r.needsConfirm) setMsg({ ok: true, text: "Check your email to confirm your account, then sign in." });
    // on success with a session, AuthProvider flips user and this panel unmounts.
  }

  return (
    <div className="grid place-items-center py-16">
      <div className="card p-6 w-full max-w-sm">
        <div className="flex items-center gap-2 font-semibold text-lg mb-1"><Lock size={18} className="text-primary-light" /> {mode === "in" ? "Sign in" : "Create account"}</div>
        <p className="text-xs text-muted mb-4">Access Nexus AI Studio on the web.</p>
        <form onSubmit={submit} className="space-y-3">
          <input className="input w-full" type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="input w-full" type="password" placeholder="Password" autoComplete={mode === "in" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <button className="btn-primary w-full inline-flex items-center justify-center gap-2" disabled={busy} type="submit">
            {busy ? <><Loader2 size={15} className="animate-spin" /> Working…</> : (mode === "in" ? "Sign in" : "Sign up")}
          </button>
        </form>
        {msg && <div className={`mt-3 text-xs ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</div>}
        <div className="mt-4 text-xs text-muted text-center">
          {mode === "in" ? (
            <>No account? <button className="text-primary hover:underline" onClick={() => { setMode("up"); setMsg(null); }}>Sign up</button></>
          ) : (
            <>Have an account? <button className="text-primary hover:underline" onClick={() => { setMode("in"); setMsg(null); }}>Sign in</button></>
          )}
        </div>
      </div>
    </div>
  );
}
