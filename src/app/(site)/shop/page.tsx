import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/site/PageHero";
import { ProductCard } from "@/components/site/ProductCard";
import { getAllProducts, getCategories } from "@/lib/data";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse our handcrafted cakes, cheesecakes and desserts.",
};

export default async function ShopPage() {
  const [products, categories] = await Promise.all([
    getAllProducts(),
    getCategories(),
  ]);

  return (
    <>
      <PageHero title="Shop" subtitle="Browse our handcrafted cakes and desserts." />
      <Container className="py-12">
        <nav className="mb-8 flex flex-wrap justify-center gap-2">
          <span className="rounded-full bg-brand px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-on-brand">
            All
          </span>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/shop/${c.slug}`}
              className="rounded-full border border-line px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-foreground hover:border-brand hover:text-brand"
            >
              {c.name}
            </Link>
          ))}
        </nav>

        {products.length === 0 ? (
          <p className="text-center text-muted">No products yet. Check back soon!</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </Container>
    </>
  );
}
