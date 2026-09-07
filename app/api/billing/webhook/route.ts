import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

/**
 * POST /api/billing/webhook
 *
 * Stripe calls this whenever a subscription-related event happens.
 * The signature is verified using STRIPE_WEBHOOK_SECRET (from Stripe
 * Dashboard > Developers > Webhooks > your endpoint > Signing secret)
 * before anything is trusted — this is what actually confirms a
 * payment happened, not just that someone visited a "success" URL.
 *
 * Handles the two events that matter for subscription state:
 *   - checkout.session.completed: first-time signup, links the Stripe
 *     customer to our Client record.
 *   - customer.subscription.updated / .deleted: keeps status current
 *     (renewed, past_due, canceled, etc.)
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set — required to verify Stripe webhooks.");
  }
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const clientId = session.client_reference_id;
      if (!clientId) break;

      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

      await prisma.subscription.upsert({
        where: { clientId },
        create: {
          clientId,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscriptionId,
          status: "active",
        },
        update: {
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscriptionId,
          status: "active",
        },
      });
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      // Newer Stripe API versions moved the billing period onto each
      // subscription item rather than the subscription itself.
      const periodEnd = sub.items.data[0]?.current_period_end;
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: {
          status: sub.status,
          currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
        },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
