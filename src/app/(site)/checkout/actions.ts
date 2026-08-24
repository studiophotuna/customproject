"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, isCheckoutConfigured } from "@/lib/stripe";

export type CheckoutInput = {
  customer: {
    name: string;
    email: string;
    phone: string;
    deliveryMethod: string;
    address: string;
    notes: string;
  };
  items: { productId: string; quantity: number }[];
};

export type CheckoutResult =
  | { url: string }
  | { error: string; notConfigured?: boolean };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createCheckoutSession(
  input: CheckoutInput,
): Promise<CheckoutResult> {
  const { customer, items } = input;

  if (!customer.name || !EMAIL_RE.test(customer.email)) {
    return { error: "Please provide your name and a valid email." };
  }
  if (!items || items.length === 0) {
    return { error: "Your cart is empty." };
  }
  if (customer.deliveryMethod === "delivery" && !customer.address.trim()) {
    return { error: "Please provide a delivery address." };
  }

  // Re-price from the database — never trust client-supplied prices.
  const supabase = await createClient();
  const ids = items.map((i) => i.productId);
  const { data: products } = await supabase
    .from("products")
    .select("id, name, price, currency, image_url, in_stock, is_active")
    .in("id", ids);

  const valid = (products ?? []).filter((p) => p.is_active && p.in_stock);
  if (valid.length === 0) {
    return { error: "The items in your cart are no longer available." };
  }

  const currency = valid[0].currency || "AED";
  const lines = valid.map((p) => {
    const qty = items.find((i) => i.productId === p.id)?.quantity ?? 1;
    return { product: p, quantity: Math.max(1, qty) };
  });
  const subtotal = lines.reduce((s, l) => s + Number(l.product.price) * l.quantity, 0);
  const deliveryFee = 0; // configurable later
  const total = subtotal + deliveryFee;

  if (!isCheckoutConfigured()) {
    return {
      error:
        "Online payment isn't connected yet. Add your Stripe and Supabase service-role keys to enable checkout.",
      notConfigured: true,
    };
  }

  const stripe = getStripe();
  if (!stripe) return { error: "Payment is not configured.", notConfigured: true };

  // Create a pending order (service role bypasses RLS, supports guest checkout).
  const admin = createAdminClient();
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      status: "pending",
      subtotal,
      delivery_fee: deliveryFee,
      total,
      currency,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone || null,
      delivery_method: customer.deliveryMethod,
      delivery_address: customer.address || null,
      notes: customer.notes || null,
    })
    .select("id")
    .single();

  if (orderErr || !order) {
    return { error: "Could not start checkout. Please try again." };
  }

  await admin.from("order_items").insert(
    lines.map((l) => ({
      order_id: order.id,
      product_id: l.product.id,
      name: l.product.name,
      price: Number(l.product.price),
      quantity: l.quantity,
    })),
  );

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customer.email,
    line_items: lines.map((l) => ({
      quantity: l.quantity,
      price_data: {
        currency: currency.toLowerCase(),
        unit_amount: Math.round(Number(l.product.price) * 100),
        product_data: {
          name: l.product.name,
          images: l.product.image_url?.startsWith("http") ? [l.product.image_url] : undefined,
        },
      },
    })),
    metadata: { order_id: order.id },
    success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/cart`,
  });

  // Record the session id against the order.
  await admin.from("orders").update({ stripe_session_id: session.id }).eq("id", order.id);

  if (!session.url) return { error: "Could not start checkout. Please try again." };
  return { url: session.url };
}
