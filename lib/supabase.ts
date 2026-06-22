// Guarded Supabase browser client. Returns null when the env isn't configured
// (e.g. the desktop build), so importing this never crashes the app — auth is
// simply unavailable there. On the web build, set NEXT_PUBLIC_SUPABASE_URL +
// NEXT_PUBLIC_SUPABASE_ANON_KEY and it activates.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anon);

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  if (typeof window === "undefined") return null; // browser-only (static export = client)
  if (!_client) {
    _client = createClient(url as string, anon as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return _client;
}
