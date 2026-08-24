import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { getProductBySlug } from "@/lib/data";
import { formatPrice } from "@/lib/utils";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return {
    title: product?.name ?? "Product",
    description: product?.description,
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <Container className="py-12">
      <Link
        href="/shop"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-brand"
      >
        <ArrowLeft className="h-4 w-4" /> Back to shop
      </Link>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-card border border-line">
          {product.isNew && (
            <span className="absolute left-4 top-4 z-10 rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-wide text-on-brand">
              New
            </span>
          )}
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        </div>

        <div>
          <h1 className="section-title text-3xl text-foreground">{product.name}</h1>
          <p className="mt-3 text-2xl font-semibold text-brand">
            {formatPrice(product.price, product.currency)}
          </p>
          <p className="mt-6 text-sm leading-relaxed text-muted">{product.description}</p>

          <p className="mt-4 text-sm">
            {product.inStock ? (
              <span className="text-brand">● In stock</span>
            ) : (
              <span className="text-red-600">● Currently unavailable</span>
            )}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" disabled={!product.inStock} className="uppercase">
              Add to Cart
            </Button>
            <Button variant="outline" size="lg" className="uppercase">
              Buy Now
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted">
            Cart &amp; checkout are wired up in a later step.
          </p>
        </div>
      </div>
    </Container>
  );
}
