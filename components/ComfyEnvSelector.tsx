"use client";
import { useState } from "react";
import { useComfyStore } from "@/lib/store/comfy";
import { Toggle } from "./ui";
import { Sparkles, Cpu, Cloud, Lock, Unlock, X, Check, Globe } from "lucide-react";

export function ComfyEnvDropdown() {
  const comfy = useComfyStore();
  const ENVS = ["Comfy Cloud", "RunComfy", "AWS Serverless", "Custom Cloud GPU"];

  if (comfy.runMode !== "cloud") return null;

  return (
    <div className="flex items-center gap-1.5 bg-surface2/80 border border-border/60 rounded-xl px-3 py-1.5 text-xs text-text shadow-sm font-medium">
      <Cloud size={14} className="text-primary-light" />
      <span className="text-muted mr-1">Cloud Location:</span>
      <select
        className="bg-transparent border-0 outline-none text-text cursor-pointer hover:text-primary transition-colors font-bold"
        value={comfy.cloudEnvironment}
        onChange={(e) => comfy.set("cloudEnvironment", e.target.value)}
      >
        {ENVS.map((env) => (
          <option key={env} value={env} className="bg-surface text-text">
            {env}
          </option>
        ))}
      </select>
    </div>
  );
}

interface ComfyEnvSelectorProps {
  onClose?: () => void;
}

export default function ComfyEnvSelector({ onClose }: ComfyEnvSelectorProps) {
  const comfy = useComfyStore();
  const [showPlans, setShowPlans] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const plans = [
    {
      id: "standard",
      name: "Standard",
      priceMonthly: 20,
      priceYearly: 16, // 20% off
      credits: "4,200",
      duration: "30 min",
      loras: false,
      videoWan: "~380",
    },
    {
      id: "creator",
      name: "Creator",
      priceMonthly: 35,
      priceYearly: 28, // 20% off
      credits: "7,400",
      duration: "30 min",
      loras: true,
      popular: true,
      videoWan: "~670",
    },
    {
      id: "pro",
      name: "Pro",
      priceMonthly: 100,
      priceYearly: 80, // 20% off
      credits: "21,100",
      duration: "1 hr",
      loras: true,
      videoWan: "~1,915",
    },
  ];

  // 1. Render Pricing Plans Modal if Cloud is selected and no plan is chosen, or user manually opened plans
  if (comfy.runMode === "cloud" && (showPlans || comfy.showPlansModal)) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-surface border border-border rounded-2xl w-full max-w-4xl shadow-2xl relative overflow-hidden my-8">
          <button
            type="button"
            className="absolute top-4 right-4 text-muted hover:text-text p-1.5 rounded-lg hover:bg-surface2 transition-colors"
            onClick={() => {
              setShowPlans(false);
              comfy.set("showPlansModal", false);
              if (onClose) onClose();
            }}
          >
            <X size={18} />
          </button>

          <div className="p-8">
            <div className="text-center mb-8">
              <span className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold uppercase tracking-wider text-primary">
                Nexusaigear Cloud
              </span>
              <h2 className="text-2xl font-bold mt-2 font-display">Plans for Personal Workspace</h2>
              <p className="text-xs text-muted mt-1">
                Choose a plan to provision remote GPU instances and start executing ComfyUI workflows in the cloud.
              </p>

              {/* Billing toggle */}
              <div className="inline-flex items-center gap-1.5 bg-surface2 border border-border/60 rounded-xl p-1 mt-6">
                <button
                  type="button"
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    billingCycle === "yearly" ? "bg-primary text-primary-fg shadow" : "text-muted hover:text-text"
                  }`}
                  onClick={() => setBillingCycle("yearly")}
                >
                  Yearly <span className="bg-primary-light/20 text-primary-light text-[9px] px-1 py-0.5 rounded ml-1 font-bold">-20%</span>
                </button>
                <button
                  type="button"
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    billingCycle === "monthly" ? "bg-primary text-primary-fg shadow" : "text-muted hover:text-text"
                  }`}
                  onClick={() => setBillingCycle("monthly")}
                >
                  Monthly
                </button>
              </div>
            </div>

            {/* Pricing Grid */}
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              {plans.map((p) => {
                const currentPrice = billingCycle === "monthly" ? p.priceMonthly : p.priceYearly;
                const isCurrent = comfy.cloudPlan === p.id;

                return (
                  <div
                    key={p.id}
                    className={`card p-6 flex flex-col justify-between border relative hover:scale-[1.01] transition-transform ${
                      p.popular ? "border-primary shadow-glow bg-primary/5" : "border-border"
                    }`}
                  >
                    {p.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-fg text-[9px] uppercase tracking-widest font-bold px-3 py-1 rounded-full border border-primary-light shadow">
                        Most Popular
                      </span>
                    )}

                    <div>
                      <h3 className="font-bold text-lg mb-1">{p.name}</h3>
                      <div className="flex items-baseline gap-1.5 mt-2">
                        <span className="text-3xl font-black text-text">${currentPrice}</span>
                        <span className="text-xs text-muted">USD / mo</span>
                      </div>
                      <p className="text-[10px] text-muted-more mt-1">
                        Billed {billingCycle === "monthly" ? "monthly" : "annually"}
                      </p>

                      <div className="text-[11px] font-medium text-muted mt-4 bg-surface2/60 border border-border/40 py-1.5 px-3 rounded-lg text-center">
                        Solo use only – <span className="text-primary hover:underline cursor-pointer font-bold">Need team workspace?</span>
                      </div>

                      {/* Features List */}
                      <ul className="space-y-2.5 mt-6 text-xs leading-tight">
                        <li className="flex items-center gap-2 text-text font-medium justify-between">
                          <span>Monthly credits</span>
                          <span className="text-primary-light font-bold flex items-center gap-1">
                            <Sparkles size={11} /> {p.credits}
                          </span>
                        </li>
                        <li className="flex items-center gap-2 text-text justify-between">
                          <span>Max run duration</span>
                          <span className="font-semibold">{p.duration}</span>
                        </li>
                        <li className="flex items-center gap-2 text-text justify-between">
                          <span>RTX 6000 Pro (96GB VRAM)</span>
                          <Check size={14} className="text-emerald-400" />
                        </li>
                        <li className="flex items-center gap-2 text-text justify-between">
                          <span>Add more credits whenever</span>
                          <Check size={14} className="text-emerald-400" />
                        </li>
                        <li className="flex items-center gap-2 text-text justify-between">
                          <span>Import your own LoRAs</span>
                          {p.loras ? (
                            <Check size={14} className="text-emerald-400" />
                          ) : (
                            <X size={14} className="text-rose-400" />
                          )}
                        </li>
                        <li className="flex items-center gap-2 text-text border-t border-border/40 pt-2.5 mt-2.5 justify-between">
                          <span className="text-[10px] text-muted leading-tight">
                            Approx. 5s videos (Wan 2.2 template)
                          </span>
                          <span className="font-bold text-[11px] text-accent">{p.videoWan}</span>
                        </li>
                      </ul>
                    </div>

                    <button
                      type="button"
                      className={`w-full text-xs font-bold py-2.5 rounded-xl transition-all mt-8 ${
                        isCurrent
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                          : p.popular
                          ? "btn-primary shadow-glow hover:brightness-110"
                          : "btn-outline"
                      }`}
                      onClick={() => {
                        comfy.set("cloudPlan", p.id as any);
                        setShowPlans(false);
                        comfy.set("showPlansModal", false);
                        if (onClose) onClose();
                      }}
                    >
                      {isCurrent ? "✓ Active Plan" : `Subscribe to ${p.name}`}
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted text-center max-w-lg mx-auto leading-relaxed">
              * Credits reset monthly. Pricing is subject to server allocation. You can cancel, upgrade, or downgrade your plan at any time directly in settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Render Startup Selection Modal if choice is NOT locked
  if (!comfy.runModeLocked) {
    return (
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl shadow-2xl p-6 relative overflow-hidden">
          <div className="text-center mb-6">
            <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold uppercase tracking-wider text-primary">
              ComfyUI Desktop-Like Provisioning
            </span>
            <h2 className="text-xl font-bold mt-2">Initialize ComfyUI Resources</h2>
            <p className="text-xs text-muted max-w-md mx-auto mt-1">
              Select how your Nexusaigear app should route workflows. You can change this selection later in Settings.
            </p>
          </div>

          <div className="grid gap-3 mb-6">
            {/* Local */}
            <button
              type="button"
              className={`card p-4 text-left border flex items-center justify-between transition-all ${
                comfy.runMode === "local" ? "border-primary bg-primary/5 shadow-glow" : "border-border hover:border-primary/40"
              }`}
              onClick={() => comfy.set("runMode", "local")}
            >
              <div className="flex gap-3 items-center">
                <div className="w-10 h-10 rounded-xl bg-surface2 flex items-center justify-center shrink-0 border border-border/40">
                  <Cpu size={18} className="text-muted" />
                </div>
                <div>
                  <div className="font-bold text-sm">Full Local Install</div>
                  <div className="text-[11px] text-muted leading-tight mt-0.5">
                    Render local nodes and execute on your own machine.
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-muted uppercase tracking-wider shrink-0 bg-surface2 py-1 px-2.5 rounded-lg border border-border/40">
                localhost:8188
              </span>
            </button>

            {/* Hybrid */}
            <button
              type="button"
              className={`card p-4 text-left border flex items-center justify-between transition-all ${
                comfy.runMode === "hybrid" ? "border-primary bg-primary/5 shadow-glow" : "border-border hover:border-primary/40"
              }`}
              onClick={() => comfy.set("runMode", "hybrid")}
            >
              <div className="flex gap-3 items-center">
                <div className="w-10 h-10 rounded-xl bg-surface2 flex items-center justify-center shrink-0 border border-border/40">
                  <Globe size={18} className="text-muted" />
                </div>
                <div>
                  <div className="font-bold text-sm">Hybrid (Local UI + Remote GPU)</div>
                  <div className="text-[11px] text-muted leading-tight mt-0.5">
                    Local node layout offloaded to cloud GPUs via <code>nathannlu/comfyui-cloud</code>.
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider shrink-0 bg-accent/10 py-1 px-2.5 rounded-lg border border-accent/20">
                Hybrid Mode
              </span>
            </button>

            {/* Cloud */}
            <button
              type="button"
              className={`card p-4 text-left border flex items-center justify-between transition-all ${
                comfy.runMode === "cloud" ? "border-primary bg-primary/5 shadow-glow" : "border-border hover:border-primary/40"
              }`}
              onClick={() => comfy.set("runMode", "cloud")}
            >
              <div className="flex gap-3 items-center">
                <div className="w-10 h-10 rounded-xl bg-surface2 flex items-center justify-center shrink-0 border border-border/40">
                  <Cloud size={18} className="text-primary-light" />
                </div>
                <div>
                  <div className="font-bold text-sm">Full Cloud API</div>
                  <div className="text-[11px] text-muted leading-tight mt-0.5">
                    Provision cloud resource plans and run serverless API execution.
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <ComfyEnvDropdown />
                <span className="text-[10px] font-bold text-primary-light uppercase tracking-wider shrink-0 bg-primary/10 py-1 px-2.5 rounded-lg border border-primary/20">
                  Cloud API
                </span>
              </div>
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-border/40 pt-4">
            <div className="flex items-center gap-3">
              <Toggle
                checked={comfy.runModeLocked}
                onChange={(b) => comfy.set("runModeLocked", b)}
              />
              <span className="text-xs text-muted flex items-center gap-1">
                {comfy.runModeLocked ? <Lock size={12} className="text-primary" /> : <Unlock size={12} />} Remember choice & lock selection
              </span>
            </div>
            <button
              type="button"
              className="btn-primary font-bold px-6 py-2 rounded-xl text-xs flex items-center gap-1 shadow-glow"
              onClick={() => {
                comfy.set("runModeLocked", true);
                if (onClose) onClose();
              }}
            >
              Confirm & Launch
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Render cloud plan button or active mode label if locked and cloud has plan
  return null;
}
