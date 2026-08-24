import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/utils";
import type { Product } from "@/lib/types";

/**
 * Product tile: image (with optional NEW badge), name, price, and an add-to-cart
 * action. The button is a no-op until the cart lands in Phase 5.
 */
export function ProductCard({ product }: { product: Product }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-card border border-line bg-background">
      <Link href={`/product/${product.slug}`} className="relative block aspect-square overflow-hidden">
        {product.isNew && (
          <span className="absolute left-3 top-3 z-10 rounded-full bg-accent px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-on-brand">
            New
          </span>
        )}
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 50vw, 200px"
          className="object-cover transition group-hover:scale-105"
        />
      </Link>
      <div className="flex flex-1 flex-col items-center gap-2 p-4 text-center">
        <h3 className="text-sm font-medium text-foreground">
          <Link href={`/product/${product.slug}`} className="hover:text-brand">
            {product.name}
          </Link>
        </h3>
        <p className="text-sm font-semibold text-brand">
          {formatPrice(product.price, product.currency)}
        </p>
        <Button variant="outline" size="sm" className="mt-auto w-full uppercase">
          Add to Cart
        </Button>
      </div>
    </div>
  );
}
