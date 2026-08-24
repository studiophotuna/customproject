"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import { useCart } from "@/components/cart/CartProvider";
import { createCheckoutSession } from "./actions";
import { formatPrice } from "@/lib/utils";

export default function CheckoutPage() {
  const { items, subtotal, ready } = useCart();
  const router = useRouter();
  const currency = items[0]?.currency ?? "AED";

  const [deliveryMethod, setDeliveryMethod] = useState("pickup");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (ready && items.length === 0) {
    return (
      <Container className="py-20 text-center">
        <h1 className="section-title text-2xl uppercase text-brand">Nothing to check out</h1>
        <ButtonLink href="/shop" size="lg" className="mt-6 uppercase">
          Shop Cakes
        </ButtonLink>
      </Container>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);

    const result = await createCheckoutSession({
      customer: {
        name: (form.get("name") ?? "").toString(),
        email: (form.get("email") ?? "").toString(),
        phone: (form.get("phone") ?? "").toString(),
        deliveryMethod,
        address: (form.get("address") ?? "").toString(),
        notes: (form.get("notes") ?? "").toString(),
      },
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    });

    if ("url" in result) {
      window.location.href = result.url;
      return;
    }
    setError(result.error);
    setPending(false);
  }

  return (
    <Container className="py-12">
      <h1 className="section-title mb-8 text-2xl uppercase text-brand">Checkout</h1>
      <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-3">
        <div className="grid gap-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" required />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" />
            </div>
            <div>
              <Label htmlFor="delivery">Fulfilment</Label>
              <Select
                id="delivery"
                value={deliveryMethod}
                onChange={(e) => setDeliveryMethod(e.target.value)}
              >
                <option value="pickup">Pickup</option>
                <option value="delivery">Delivery</option>
              </Select>
            </div>
          </div>
          {deliveryMethod === "delivery" && (
            <div>
              <Label htmlFor="address">Delivery address *</Label>
              <Textarea id="address" name="address" required />
            </div>
          )}
          <div>
            <Label htmlFor="notes">Order notes</Label>
            <Textarea id="notes" name="notes" placeholder="Message on cake, allergies, timing…" />
          </div>
        </div>

        <div className="h-fit rounded-card border border-line bg-surface p-6">
          <h2 className="mb-4 font-semibold text-foreground">Order Summary</h2>
          <ul className="mb-4 space-y-2 text-sm">
            {items.map((i) => (
              <li key={i.productId} className="flex justify-between gap-2">
                <span className="text-muted">
                  {i.name} × {i.quantity}
                </span>
                <span>{formatPrice(i.price * i.quantity, i.currency)}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between border-t border-line pt-3 text-sm font-semibold">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal, currency)}</span>
          </div>
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
          <Button type="submit" size="lg" disabled={pending} className="mt-6 w-full uppercase">
            {pending ? "Redirecting…" : "Pay Now"}
          </Button>
          <p className="mt-3 text-center text-xs text-muted">
            Secure payment powered by Stripe.
          </p>
        </div>
      </form>
    </Container>
  );
}
