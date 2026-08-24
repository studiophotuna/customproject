import "server-only";
import Stripe from "stripe";

/**
 * Lazily construct the Stripe client. Returns null when STRIPE_SECRET_KEY is
 * not configured, so the checkout flow can degrade gracefully until keys are
 * added (no redeploy of code needed — just set the env vars).
 */
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

/** True when both Stripe and the service role are configured for checkout. */
export function isCheckoutConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
