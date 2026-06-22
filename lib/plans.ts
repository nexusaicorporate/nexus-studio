// Subscription tiers + a-la-carte add-ons. Single source of truth shared by the
// billing UI (M2) and entitlement gating (M3). Stripe **price IDs are NOT here** —
// they live as secrets in the Edge Functions; the client only sends the plan/add-on
// `id` and the function maps it to the right price. That keeps prices server-side.
//
// `tier` ranks plans for comparisons. `models` is the entitlement list M3 uses to
// decide which models/providers a plan unlocks ("*" = all). Edit the model ids to
// match your provider list; these are sensible starters.

export type PlanId = "free" | "pro" | "studio";

export interface Plan {
  id: PlanId;
  tier: number;                 // higher = more access
  name: string;
  priceLabel: string;           // display only
  blurb: string;
  models: string[];             // provider/model ids unlocked; ["*"] = all
}

export interface AddOn {
  id: string;                   // e.g. "nsfw"
  name: string;
  priceLabel: string;
  blurb: string;
}

export const PLANS: Plan[] = [
  {
    id: "free", tier: 0, name: "Free", priceLabel: "$0",
    blurb: "Core image generation, bring your own API keys.",
    models: ["pollinations"],
  },
  {
    id: "pro", tier: 1, name: "Pro", priceLabel: "$12/mo",
    blurb: "More image models + higher resolution and limits.",
    models: ["pollinations", "openai", "anthropic", "google"],
  },
  {
    id: "studio", tier: 2, name: "Studio", priceLabel: "$29/mo",
    blurb: "Everything, including video (LTX) and priority features.",
    models: ["*"],
  },
];

export const ADDONS: AddOn[] = [
  {
    id: "nsfw", name: "NSFW Access", priceLabel: "$8/mo",
    blurb: "Unlock uncensored models and remove content filtering.",
  },
];

export const DEFAULT_PLAN: PlanId = "free";

export function planById(id: string | undefined): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

// Does a plan + add-ons grant a given model id? ("*" plan = everything.)
export function planAllowsModel(planId: string | undefined, modelId: string): boolean {
  const p = planById(planId);
  return p.models.includes("*") || p.models.includes(modelId);
}
