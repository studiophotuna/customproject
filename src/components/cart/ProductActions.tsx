"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { AddToCartButton, BuyNowButton } from "@/components/cart/AddToCartButton";
import type { CartItem } from "@/components/cart/CartProvider";

/** Quantity stepper + add-to-cart / buy-now for the product detail page. */
export function ProductActions({
  item,
  inStock,
}: {
  item: Omit<CartItem, "quantity">;
  inStock: boolean;
}) {
  const [qty, setQty] = useState(1);

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted">Quantity</span>
        <div className="inline-flex items-center rounded-card border border-line">
          <button
            type="button"
            aria-label="Decrease"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="px-3 py-2 hover:bg-surface"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-sm">{qty}</span>
          <button
            type="button"
            aria-label="Increase"
            onClick={() => setQty((q) => q + 1)}
            className="px-3 py-2 hover:bg-surface"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <AddToCartButton item={item} quantity={qty} disabled={!inStock} size="lg" variant="outline" />
        <BuyNowButton item={item} quantity={qty} disabled={!inStock} />
      </div>
    </div>
  );
}
