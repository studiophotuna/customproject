"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { useCart } from "@/components/cart/CartProvider";
import { formatPrice } from "@/lib/utils";

export default function CartPage() {
  const { items, subtotal, setQuantity, removeItem, ready } = useCart();
  const currency = items[0]?.currency ?? "AED";

  if (ready && items.length === 0) {
    return (
      <Container className="py-20 text-center">
        <h1 className="section-title text-2xl uppercase text-brand">Your cart is empty</h1>
        <p className="mt-3 text-sm text-muted">Add some sweet treats to get started.</p>
        <ButtonLink href="/shop" size="lg" className="mt-6 uppercase">
          Shop Cakes
        </ButtonLink>
      </Container>
    );
  }

  return (
    <Container className="py-12">
      <h1 className="section-title mb-8 text-2xl uppercase text-brand">Your Cart</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ul className="divide-y divide-line rounded-card border border-line">
            {items.map((it) => (
              <li key={it.productId} className="flex gap-4 p-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border border-line bg-surface">
                  <Image src={it.imageUrl} alt={it.name} fill sizes="80px" className="object-cover" />
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="flex justify-between gap-2">
                    <Link href={`/product/${it.slug}`} className="font-medium hover:text-brand">
                      {it.name}
                    </Link>
                    <button
                      aria-label="Remove"
                      onClick={() => removeItem(it.productId)}
                      className="text-muted hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-sm text-brand">{formatPrice(it.price, it.currency)}</p>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="inline-flex items-center rounded-card border border-line">
                      <button
                        aria-label="Decrease"
                        onClick={() => setQuantity(it.productId, it.quantity - 1)}
                        className="px-2 py-1.5 hover:bg-surface"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm">{it.quantity}</span>
                      <button
                        aria-label="Increase"
                        onClick={() => setQuantity(it.productId, it.quantity + 1)}
                        className="px-2 py-1.5 hover:bg-surface"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="text-sm font-medium">
                      {formatPrice(it.price * it.quantity, it.currency)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="h-fit rounded-card border border-line bg-surface p-6">
          <h2 className="mb-4 font-semibold text-foreground">Order Summary</h2>
          <div className="flex justify-between text-sm text-muted">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal, currency)}</span>
          </div>
          <p className="mt-1 text-xs text-muted">Delivery calculated at checkout.</p>
          <ButtonLink href="/checkout" size="lg" className="mt-6 w-full uppercase">
            Proceed to Checkout
          </ButtonLink>
          <Link href="/shop" className="mt-3 block text-center text-sm text-brand">
            Continue shopping
          </Link>
        </div>
      </div>
    </Container>
  );
}
