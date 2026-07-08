import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("Stripe-Signature") as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  const session = event.data.object as any;

  if (event.type === "checkout.session.completed") {
    // Retrieve the subscription details from Stripe.
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string
    );

    // Update the database here with the subscription details
    // e.g. update user's stripeCustomerId, stripeSubscriptionId, stripePriceId, stripeCurrentPeriodEnd
    console.log("Subscription successful for customer:", session.customer);
    console.log("Subscription ID:", subscription.id);
  }

  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as any;
    // Update the database here with the new subscription details
    console.log("Subscription updated:", subscription.id);
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as any;
    // Update the database to reflect the canceled subscription
    console.log("Subscription deleted:", subscription.id);
  }

  return new NextResponse(null, { status: 200 });
}
