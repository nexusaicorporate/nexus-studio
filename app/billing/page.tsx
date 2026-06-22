"use client";

import { useEffect, useState } from "react";
import Page from "@/components/Page";
import { PLANS, ADDONS, getCheckoutUrl } from "@/lib/billing";
import { useAuth } from "@/components/AuthProvider";
import { getSupabase } from "@/lib/supabase";
import { CreditCard, CheckCircle2, Zap, AlertCircle } from "lucide-react";

export default function BillingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [currentAddons, setCurrentAddons] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      const sb = getSupabase();
      if (!sb) return;
      
      const { data, error } = await sb.from("profiles").select("plan, addons").eq("id", user.id).single();
      
      if (error) {
        setError(error.message);
      } else if (data) {
        setCurrentPlan(data.plan || "free");
        setCurrentAddons(data.addons || []);
      }
      setLoading(false);
    }
    fetchProfile();
  }, [user]);

  if (loading) {
    return <Page title="Billing & Plans"><div className="p-6 text-muted">Loading your subscription details...</div></Page>;
  }

  return (
    <Page title="Billing & Plans" subtitle="Manage your subscription and unlocking extra features.">
      <div className="max-w-4xl p-6">
        
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex gap-3 text-sm">
            <AlertCircle className="shrink-0" size={18} /> {error}
          </div>
        )}

        <div className="mb-8 p-5 bg-surface-alt border border-border rounded-xl flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg text-primary mb-1">Your Current Plan: <span className="uppercase">{currentPlan}</span></h3>
            <p className="text-sm text-muted">Active Add-ons: {currentAddons.length > 0 ? currentAddons.join(", ") : "None"}</p>
          </div>
          <div className="text-right text-xs text-muted">
            <p>Billed securely via Stripe.</p>
            <p>Signed in as {user?.email}</p>
          </div>
        </div>

        <h3 className="font-semibold text-xl mb-4">Subscription Plans</h3>
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {PLANS.map(plan => {
            const isActive = currentPlan === plan.id;
            const checkoutUrl = user ? getCheckoutUrl(plan.stripePaymentLink, user.id) : null;
            
            return (
              <div key={plan.id} className={`card p-6 flex flex-col ${isActive ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
                <div className="mb-4">
                  <h4 className="font-bold text-xl">{plan.name}</h4>
                  <div className="mt-2 text-3xl font-black">${plan.price}<span className="text-sm font-normal text-muted">/mo</span></div>
                  <p className="text-sm text-muted mt-2">{plan.description}</p>
                </div>
                
                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex gap-2 text-sm text-text/80">
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                {isActive ? (
                  <button disabled className="btn-primary w-full opacity-50 cursor-default">Current Plan</button>
                ) : plan.price === 0 ? (
                  <button disabled className="btn-outline w-full opacity-50 cursor-default">Free Tier</button>
                ) : (
                  <a href={checkoutUrl || "#"} target="_blank" rel="noreferrer" className="btn-primary w-full inline-flex justify-center">
                    Upgrade to {plan.name}
                  </a>
                )}
              </div>
            );
          })}
        </div>

        <h3 className="font-semibold text-xl mb-4">À La Carte Add-ons</h3>
        <div className="grid md:grid-cols-2 gap-6">
          {ADDONS.map(addon => {
            const isOwned = currentAddons.includes(addon.id);
            const checkoutUrl = user ? getCheckoutUrl(addon.stripePaymentLink, user.id) : null;

            return (
              <div key={addon.id} className="card p-6 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0">
                  <Zap size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold">{addon.name}</h4>
                    <span className="font-semibold">${addon.price}</span>
                  </div>
                  <p className="text-xs text-muted mt-1">{addon.description}</p>
                </div>
                <div>
                  {isOwned ? (
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider bg-emerald-400/10 px-3 py-1.5 rounded-full">Unlocked</span>
                  ) : (
                    <a href={checkoutUrl || "#"} target="_blank" rel="noreferrer" className="btn-outline text-xs px-4">
                      Purchase
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Page>
  );
}
