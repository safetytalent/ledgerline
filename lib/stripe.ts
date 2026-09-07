import Stripe from "stripe";

/**
 * Shared Stripe client, created lazily on first use rather than at
 * import time. This matters because Next.js evaluates route modules
 * during the build step to collect metadata — if `new Stripe(...)`
 * ran at import time, the build would fail whenever
 * STRIPE_SECRET_KEY isn't set yet (e.g. before you've added it to
 * Vercel), even though no request has actually happened.
 *
 * Requires STRIPE_SECRET_KEY in the environment — get this from the
 * Stripe Dashboard (Developers > API keys). Use the "test mode"
 * secret key until you're ready for real charges.
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error(
        "STRIPE_SECRET_KEY is not set — add it in Vercel's Environment Variables (from the Stripe Dashboard > Developers > API keys)."
      );
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-08-26.dahlia",
    });
  }
  return _stripe;
}
