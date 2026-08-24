"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { useCart, type CartItem } from "@/components/cart/CartProvider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Item = Omit<CartItem, "quantity">;

/** Add-to-cart button with a brief confirmation state. */
export function AddToCartButton({
  item,
  quantity = 1,
  disabled,
  className,
  variant = "outline",
  size = "sm",
  label = "Add to Cart",
}: {
  item: Item;
  quantity?: number;
  disabled?: boolean;
  className?: string;
  variant?: "primary" | "outline";
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={disabled}
      className={cn("uppercase", className)}
      onClick={() => {
        addItem(item, quantity);
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
    >
      {added ? (
        <>
          <Check className="h-4 w-4" /> Added
        </>
      ) : (
        label
      )}
    </Button>
  );
}

/** Add to cart then go straight to checkout. */
export function BuyNowButton({
  item,
  quantity = 1,
  disabled,
  className,
}: {
  item: Item;
  quantity?: number;
  disabled?: boolean;
  className?: string;
}) {
  const { addItem } = useCart();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="primary"
      size="lg"
      disabled={disabled}
      className={cn("uppercase", className)}
      onClick={() => {
        addItem(item, quantity);
        router.push("/checkout");
      }}
    >
      Buy Now
    </Button>
  );
}
