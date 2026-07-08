"use client";

import React, { useState } from "react";
import Page from "@/components/Page";
import { Check, Crown, Zap, Shield, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

const TIERS = [
  {
    id: "free",
    name: "Hobby",
    description: "Perfect for exploring AI workflows and casual generation.",
    price: { monthly: 0, yearly: 0 },
    icon: Zap,
    features: [
      "50 Daily Generative Credits",
      "Standard SDXL & Flux Models",
      "Local Asset Library (up to 100 items)",
      "Basic Chat Assistant",
      "Community Support"
    ],
    buttonText: "Current Plan",
    buttonVariant: "outline"
  },
  {
    id: "pro",
    name: "Pro",
    description: "For professionals needing high-res outputs and advanced control.",
    price: { monthly: 29, yearly: 290 },
    icon: Sparkles,
    popular: true,
    features: [
      "Unlimited Generative Credits",
      "Pro Custom Fine-Tuned Models",
      "Cloud Asset Sync (up to 10k items)",
      "High-Resolution Upscaling (8k)",
      "Priority Email Support"
    ],
    buttonText: "Upgrade to Pro",
    buttonVariant: "primary",
    stripePriceId: { 
      monthly: "price_1Tqk77Ddw6EA34Q2wPvGUjEv", 
      yearly: "price_1Tqk77Ddw6EA34Q2XrtNGrna" 
    }
  },
  {
    id: "studio",
    name: "Studio",
    description: "Uncapped performance, custom models, and enterprise API access.",
    price: { monthly: 99, yearly: 990 },
    icon: Crown,
    features: [
      "Dedicated GPU Instances",
      "Team Collaboration & Shared Libraries",
      "API Access for External Integrations",
      "Advanced UGC Ad Automation",
      "24/7 White-glove Support"
    ],
    buttonText: "Contact Sales",
    buttonVariant: "outline",
    stripePriceId: { 
      monthly: "price_1Tqk77Ddw6EA34Q2cmwrsIjd", 
      yearly: "price_1Tqk78Ddw6EA34Q2M0JtxSyq" 
    }
  }
];

export default function BillingPage() {
  const { plan, user } = useAuth();
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (tierId: string, priceId?: string) => {
    if (!priceId) return; // e.g., Hobby or Contact Sales
    
    setLoading(tierId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout failed:", error);
    } finally {
      setLoading(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      // customerId would typically come from your auth session
      const res = await fetch("/api/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: "cus_placeholder" }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Portal failed:", error);
    }
  };

  return (
    <Page title="Billing & Plans" subtitle="Manage your subscription and usage">
      <div className="max-w-6xl mx-auto py-8">
        
        {/* Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-surface border border-border rounded-full p-1 flex items-center shadow-lg">
            <button
              onClick={() => setInterval("monthly")}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                interval === "monthly" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted hover:text-text"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval("yearly")}
              className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                interval === "yearly" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted hover:text-text"
              }`}
            >
              Yearly <span className="ml-1 text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TIERS.map((tier) => {
            const Icon = tier.icon;
            const isPopular = tier.popular;
            const priceId = tier.stripePriceId?.[interval];
            
            return (
              <div 
                key={tier.id}
                className={`relative bg-surface border rounded-2xl flex flex-col p-8 transition-all hover:shadow-2xl ${
                  isPopular ? "border-primary shadow-[0_0_40px_-15px_rgba(var(--primary-rgb),0.5)] scale-105 z-10 bg-surface/80 backdrop-blur-xl" : "border-border hover:border-border/80"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-0 right-0 flex justify-center">
                    <span className="bg-gradient-to-r from-primary to-indigo-500 text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-lg ${isPopular ? "bg-primary/20 text-primary" : "bg-surface2 text-muted"}`}>
                    <Icon size={24} />
                  </div>
                  <h3 className="text-2xl font-bold">{tier.name}</h3>
                </div>
                
                <p className="text-muted text-sm mb-6 min-h-[40px]">{tier.description}</p>
                
                <div className="mb-8">
                  <span className="text-5xl font-black">${tier.price[interval]}</span>
                  <span className="text-muted ml-2">/ {interval === "monthly" ? "mo" : "yr"}</span>
                </div>
                
                {plan === tier.id ? (
                  <button 
                    disabled
                    className="w-full py-3 rounded-lg font-bold mb-8 flex items-center justify-center gap-2 transition-all bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-not-allowed"
                  >
                    Current Plan
                    <Check size={16} />
                  </button>
                ) : (
                  <button 
                    onClick={() => tier.id !== "free" && handleCheckout(tier.id, priceId)}
                    disabled={loading === tier.id || (!priceId && tier.id !== "free")}
                    className={`w-full py-3 rounded-lg font-bold mb-8 flex items-center justify-center gap-2 transition-all ${
                      tier.buttonVariant === "primary" 
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_-5px_rgba(var(--primary-rgb),0.5)]" 
                        : "bg-surface2 hover:bg-surface border border-border text-text"
                    } ${loading === tier.id || (!priceId && tier.id !== "free") ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {loading === tier.id ? "Loading..." : (tier.id === "free" && plan !== "free" ? "Downgrade" : tier.buttonText)}
                    {tier.id !== "free" && <ArrowRight size={16} />}
                  </button>
                )}
                
                <div className="space-y-4 flex-1">
                  <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Features</p>
                  {tier.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-0.5 bg-emerald-500/20 text-emerald-400 p-0.5 rounded-full shrink-0">
                        <Check size={12} strokeWidth={3} />
                      </div>
                      <span className="text-sm text-text/80">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Secure Checkout Banner */}
        <div className="mt-16 flex items-center justify-center gap-2 text-muted text-sm">
          <Shield size={16} className="text-emerald-400" />
          <span>Payments are securely processed via <strong>Stripe</strong>. You can cancel at any time.</span>
        </div>

      </div>
    </Page>
  );
}
