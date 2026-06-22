"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { DEFAULT_PLAN } from "@/lib/plans";

export interface Profile {
  plan: string;
  addons: string[];
  stripe_customer_id?: string | null;
}

// Reads the signed-in user's profile row (plan + addons). RLS restricts it to
// their own row. Re-fetches when the user changes. Returns a safe default while
// loading / when unauthenticated.
export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile>({ plan: DEFAULT_PLAN, addons: [] });
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const sb = getSupabase();
    if (!sb || !user) { setProfile({ plan: DEFAULT_PLAN, addons: [] }); return; }
    setLoading(true);
    const { data } = await sb
      .from("profiles")
      .select("plan, addons, stripe_customer_id")
      .eq("id", user.id)
      .single();
    setLoading(false);
    if (data) {
      setProfile({
        plan: data.plan || DEFAULT_PLAN,
        addons: Array.isArray(data.addons) ? data.addons : [],
        stripe_customer_id: data.stripe_customer_id,
      });
    }
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user?.id]);

  return { profile, loading, refresh, hasAddon: (id: string) => profile.addons.includes(id) };
}
