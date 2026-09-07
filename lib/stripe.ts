import Stripe from "stripe";

/**
 * Single shared Stripe client. Requires STRIPE_SECRET_KEY in the
 * environment — get this from the Stripe Dashboard (Developers > API
 * keys). Use the "test mode" secret key until you're ready for real
 * charges.
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-08-26.dahlia",
});
