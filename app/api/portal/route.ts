import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  try {
    // In production, this should be fetched securely from the authenticated user's session
    const { customerId } = await req.json();

    if (!customerId) {
      return new NextResponse("Customer ID is required", { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe Portal Error:", error);
    return new NextResponse(error.message, { status: 500 });
  }
}
