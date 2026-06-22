// lib/billing.ts

export type PlanId = "free" | "pro" | "studio";

export interface PlanConfig {
  id: PlanId;
  name: string;
  price: number;
  interval: "month";
  description: string;
  features: string[];
  stripePaymentLink?: string; // e.g. https://buy.stripe.com/test_...
}

export const PLANS: PlanConfig[] = [
  {
    id: "free",
    name: "Free",
    price: 0,
    interval: "month",
    description: "The basics for casual users.",
    features: [
      "Access to basic models",
      "Limited daily generations",
      "Standard support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 15,
    interval: "month",
    description: "For creators needing more power.",
    features: [
      "Access to Pro models (LTX, Video)",
      "Unlimited generations (BYO Keys)",
      "Priority support",
    ],
    // Replace with your real Stripe Payment Link for the Pro subscription
    stripePaymentLink: "https://buy.stripe.com/test_123_pro", 
  },
  {
    id: "studio",
    name: "Studio",
    price: 35,
    interval: "month",
    description: "The ultimate toolkit for professionals.",
    features: [
      "All Pro features",
      "Early access to new engines",
      "Studio API access",
      "1-on-1 onboarding",
    ],
    // Replace with your real Stripe Payment Link for the Studio subscription
    stripePaymentLink: "https://buy.stripe.com/test_123_studio",
  },
];

export interface AddonConfig {
  id: string;
  name: string;
  price: number;
  type: "one-time" | "recurring";
  description: string;
  stripePaymentLink?: string;
}

export const ADDONS: AddonConfig[] = [
  {
    id: "nsfw",
    name: "NSFW Unlock",
    price: 10,
    type: "one-time",
    description: "Unlock unfiltered models and remove safety filters.",
    // Replace with your real Stripe Payment Link for the NSFW one-time purchase
    stripePaymentLink: "https://buy.stripe.com/test_123_nsfw",
  },
];

// Helper to construct the checkout URL with the user's ID as the client_reference_id
export function getCheckoutUrl(paymentLink: string | undefined, userId: string): string | null {
  if (!paymentLink) return null;
  const url = new URL(paymentLink);
  url.searchParams.set("client_reference_id", userId);
  return url.toString();
}
