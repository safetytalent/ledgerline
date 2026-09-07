import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";

/**
 * GET /api/billing/checkout?clientId=<client id>
 *
 * Starts a Stripe-hosted checkout flow for a client's subscription.
 * Requires STRIPE_PRICE_ID in the environment — create a Product +
 * Price in the Stripe Dashboard first (Products > Add product), then
 * copy its Price ID (starts with "price_") into that env var.
 *
 * Reuses an existing Stripe customer if this client already has one
 * (e.g. a past canceled subscription) instead of creating duplicates.
 */
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "Missing clientId" }, { status: 400 });
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { subscription: true },
  });
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    throw new Error(
      "STRIPE_PRICE_ID is not set — create a Product/Price in the Stripe Dashboard and add its price_... id to the environment."
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer: client.subscription?.stripeCustomerId, // reuse if one exists
    client_reference_id: client.id,
    success_url: `${appUrl}/dashboard/clients?billing=success`,
    cancel_url: `${appUrl}/dashboard/clients?billing=cancelled`,
  });

  return NextResponse.redirect(session.url!);
}
