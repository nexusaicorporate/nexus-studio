import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const getStripe = () =>
  new Stripe(process.env.STRIPE_SECRET_KEY || "", {
    apiVersion: "2026-06-24.dahlia" as any,
  });

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  const stripe = getStripe();

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle the checkout session completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // The user ID was passed in via client_reference_id in lib/billing.ts
    const userId = session.client_reference_id;
    if (!userId) {
      console.error("No client_reference_id found in session");
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    try {
      // Retrieve the session to get line items
      const expandedSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["line_items"],
      });

      const lineItems = expandedSession.line_items?.data || [];
      
      // Determine what was purchased based on the product description
      let newPlan: string | null = null;
      let newAddon: string | null = null;

      for (const item of lineItems) {
        const desc = (item.description || "").toLowerCase();
        if (desc.includes("studio")) {
          newPlan = "studio";
        } else if (desc.includes("pro")) {
          newPlan = "pro";
        } else if (desc.includes("nsfw")) {
          newAddon = "nsfw";
        }
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error("User not found: " + userId);

      const updates: { plan?: string; groups?: string[] } = {};

      if (newPlan) updates.plan = newPlan;

      if (newAddon) {
        const currentGroups = user.groups || [];
        if (!currentGroups.includes(newAddon + "-plan")) {
          updates.groups = [...currentGroups, newAddon + "-plan"];
        }
      }

      if (Object.keys(updates).length > 0) {
        await prisma.user.update({ where: { id: userId }, data: updates });
        console.log(`Successfully updated user ${userId} with:`, updates);
      } else {
        console.log("Nothing to update for this purchase.");
      }

    } catch (err: any) {
      console.error("Error processing checkout session:", err.message);
      return NextResponse.json({ error: "Internal processing error" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
