"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/site/ProductCard";
import type { Product } from "@/lib/types";

/**
 * Horizontal, scroll-snapping product carousel with prev/next controls.
 * Cards keep a fixed width and the row scrolls rather than wrapping.
 */
export function ProductCarousel({ products }: { products: Product[] }) {
  const scroller = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    // Scroll by roughly the visible width so it pages through cards.
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.8, 240), behavior: "smooth" });
  };

  if (products.length === 0) {
    return <p className="text-center text-muted">No favorites yet.</p>;
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Previous"
        onClick={() => scrollBy(-1)}
        className="absolute -left-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-line bg-background p-2 shadow-sm hover:bg-surface sm:block"
      >
        <ChevronLeft className="h-5 w-5 text-brand" />
      </button>

      <div
        ref={scroller}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="w-52 shrink-0 snap-start sm:w-56 lg:w-60"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      <button
        type="button"
        aria-label="Next"
        onClick={() => scrollBy(1)}
        className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-line bg-background p-2 shadow-sm hover:bg-surface sm:block"
      >
        <ChevronRight className="h-5 w-5 text-brand" />
      </button>
    </div>
  );
}
