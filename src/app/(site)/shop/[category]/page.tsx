import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/site/PageHero";
import { ProductCard } from "@/components/site/ProductCard";
import {
  getCategories,
  getCategoryBySlug,
  getProductsByCategory,
} from "@/lib/data";

type Params = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { category } = await params;
  const cat = await getCategoryBySlug(category);
  return { title: cat?.name ?? "Shop" };
}

export default async function CategoryPage({ params }: Params) {
  const { category } = await params;
  const cat = await getCategoryBySlug(category);
  if (!cat) notFound();

  const [products, categories] = await Promise.all([
    getProductsByCategory(category),
    getCategories(),
  ]);

  return (
    <>
      <PageHero title={cat.name} subtitle={cat.description} />
      <Container className="py-12">
        <nav className="mb-8 flex flex-wrap justify-center gap-2">
          <Link
            href="/shop"
            className="rounded-full border border-line px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-foreground hover:border-brand hover:text-brand"
          >
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/shop/${c.slug}`}
              className={
                c.slug === cat.slug
                  ? "rounded-full bg-brand px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-on-brand"
                  : "rounded-full border border-line px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-foreground hover:border-brand hover:text-brand"
              }
            >
              {c.name}
            </Link>
          ))}
        </nav>

        {products.length === 0 ? (
          <p className="text-center text-muted">No products in this category yet.</p>
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
