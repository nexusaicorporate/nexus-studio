"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";

interface AuthResult { error?: string; needsConfirm?: boolean }

interface AuthCtx {
  ready: boolean;            // finished the initial session check
  configured: boolean;      // Supabase env present (web build)
  user: User | null;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const noop = async (): Promise<AuthResult> => ({ error: "Auth is not configured." });
const Ctx = createContext<AuthCtx>({
  ready: true, configured: false, user: null, session: null,
  signIn: noop, signUp: noop, signOut: async () => {},
});

export function useAuth() { return useContext(Ctx); }

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) { setReady(true); return; }
    let alive = true;
    sb.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  async function signIn(email: string, password: string): Promise<AuthResult> {
    const sb = getSupabase();
    if (!sb) return { error: "Auth is not configured." };
    const { error } = await sb.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  }

  async function signUp(email: string, password: string): Promise<AuthResult> {
    const sb = getSupabase();
    if (!sb) return { error: "Auth is not configured." };
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) return { error: error.message };
    // If email confirmation is on, there's no session yet.
    return { needsConfirm: !data.session };
  }

  async function signOut(): Promise<void> {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    setSession(null);
  }

  return (
    <Ctx.Provider value={{
      ready, configured: supabaseConfigured,
      user: session?.user ?? null, session,
      signIn, signUp, signOut,
    }}>
      {children}
    </Ctx.Provider>
  );
}
