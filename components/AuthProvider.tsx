"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useSession, signIn, signOut as nextSignOut, SessionProvider } from "next-auth/react";
import { WEB_MODE } from "@/lib/webmode";

interface AuthResult { error?: string; needsConfirm?: boolean }

interface AuthCtx {
  ready: boolean;
  configured: boolean;
  user: { id: string; email: string; plan: string; groups: string[] } | null;
  session: any | null;
  plan: string;
  addons: string[];
  groups: string[];
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const noop = async (): Promise<AuthResult> => ({ error: "Auth is not configured." });
const Ctx = createContext<AuthCtx>({
  ready: true, configured: false, user: null, session: null,
  plan: "free", addons: [], groups: [],
  signIn: noop, signUp: noop, signOut: async () => {},
});

export function useAuth() { return useContext(Ctx); }

// Add-ons are stored on the user's `groups` as "<addon>-plan" (e.g. "nsfw-plan"),
// written by the Stripe webhook and the admin gear. The studios check
// canUseNsfw(addons) against bare ids ("nsfw"), so map groups -> addon ids here.
function deriveAddons(groups: string[]): string[] {
  return (groups || [])
    .filter((g) => g.endsWith("-plan"))
    .map((g) => g.slice(0, -"-plan".length));
}

function AuthInner({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const ready = status !== "loading";
  const u = session?.user as any;

  async function handleSignIn(email: string, password: string): Promise<AuthResult> {
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) return { error: "Invalid email or password." };
    return {};
  }

  async function handleSignUp(email: string, password: string): Promise<AuthResult> {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || "Registration failed." };
    // Auto sign in after registration
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) return { error: "Registered but could not sign in. Please try logging in." };
    return {};
  }

  async function handleSignOut() {
    await nextSignOut({ redirect: false });
  }

  let currentPlan = u?.plan ?? "free";
  if (u?.groups?.includes("studio")) {
    currentPlan = "studio";
  } else if (u?.groups?.includes("pro")) {
    currentPlan = "pro";
  }

  const user = u?.id ? { id: u.id, email: u.email ?? "", plan: currentPlan, groups: u.groups ?? [] } : null;

  return (
    <Ctx.Provider value={{
      ready,
      configured: true,
      user,
      session,
      plan: currentPlan,
      addons: deriveAddons(u?.groups ?? []),
      groups: u?.groups ?? [],
      signIn: handleSignIn,
      signUp: handleSignUp,
      signOut: handleSignOut,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  // In desktop (non-web) mode, skip auth entirely
  if (!WEB_MODE) {
    return (
      <Ctx.Provider value={{
        ready: true, configured: false, user: null, session: null,
        plan: "free", addons: [], groups: [],
        signIn: noop, signUp: noop, signOut: async () => {},
      }}>
        {children}
      </Ctx.Provider>
    );
  }

  return (
    <SessionProvider>
      <AuthInner>{children}</AuthInner>
    </SessionProvider>
  );
}
