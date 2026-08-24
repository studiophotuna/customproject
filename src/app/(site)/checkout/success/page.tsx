"use client";

import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { useCart } from "@/components/cart/CartProvider";

export default function CheckoutSuccessPage() {
  const { clear } = useCart();

  // Payment succeeded (Stripe redirected here) — empty the cart.
  useEffect(() => {
    clear();
  }, [clear]);

  return (
    <Container className="py-20 text-center">
      <CheckCircle2 className="mx-auto h-14 w-14 text-brand" />
      <h1 className="section-title mt-4 text-3xl uppercase text-brand">Thank you!</h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-muted">
        Your order has been received and payment confirmed. We&apos;ll be in touch
        shortly with the details. We can&apos;t wait to make your celebration sweeter!
      </p>
      <ButtonLink href="/shop" size="lg" className="mt-8 uppercase">
        Continue Shopping
      </ButtonLink>
    </Container>
  );
}
