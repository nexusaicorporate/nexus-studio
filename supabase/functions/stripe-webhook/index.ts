import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Grab environment variables injected by Supabase Edge Functions
const STRIPE_API_KEY = Deno.env.get("STRIPE_API_KEY") || "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const stripe = new Stripe(STRIPE_API_KEY, {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(), // required for Deno/Edge
});

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  // We only handle POST requests for webhooks
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("Stripe-Signature");
  if (!signature) {
    return new Response("No signature provided", { status: 400 });
  }

  try {
    const bodyText = await req.text();
    // Verify the webhook signature
    const event = stripe.webhooks.constructEvent(bodyText, signature, STRIPE_WEBHOOK_SECRET);

    console.log(`[Stripe Webhook] Received event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // The client_reference_id contains the user's UUID
        const userId = session.client_reference_id;
        
        if (!userId) {
          console.error("No client_reference_id provided in checkout session");
          break;
        }

        // We can inspect the session or line items to know what they bought.
        // For simplicity, we assume you map the Stripe Payment Link to a specific plan/addon in metadata,
        // OR we can just check the line items if we expanded them.
        // Assuming we pass `metadata.plan` or `metadata.addon` on the Payment Link:
        const plan = session.metadata?.plan; // "pro" | "studio"
        const addon = session.metadata?.addon; // "nsfw"

        if (plan) {
          // Upgrade the user's plan
          const { error } = await supabase
            .from("profiles")
            .update({ plan, stripe_customer_id: session.customer as string })
            .eq("id", userId);
            
          if (error) console.error("Error upgrading plan:", error);
          else console.log(`Upgraded user ${userId} to plan: ${plan}`);
        }

        if (addon) {
          // Add the addon to the JSONB array
          // To append to JSONB arrays in Postgres we can read first, then update,
          // or use a raw RPC. Doing read-then-update for simplicity in Edge Functions:
          const { data: profile } = await supabase.from("profiles").select("addons").eq("id", userId).single();
          const currentAddons: string[] = profile?.addons || [];
          
          if (!currentAddons.includes(addon)) {
            const { error } = await supabase
              .from("profiles")
              .update({ addons: [...currentAddons, addon] })
              .eq("id", userId);
              
            if (error) console.error("Error granting addon:", error);
            else console.log(`Granted addon ${addon} to user ${userId}`);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        // When a subscription is canceled/ends, revert them to free.
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        const { error } = await supabase
          .from("profiles")
          .update({ plan: "free" })
          .eq("stripe_customer_id", customerId);
          
        if (error) console.error("Error downgrading plan:", error);
        else console.log(`Downgraded customer ${customerId} to free plan.`);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error(`Webhook signature verification failed:`, err);
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});
