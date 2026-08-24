import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/site/SectionHeading";
import { ProductCard } from "@/components/site/ProductCard";
import { getFeaturedProducts } from "@/lib/data";

export async function FeaturedProducts() {
  const products = await getFeaturedProducts();
  return (
    <section className="bg-surface py-16">
      <Container>
        <SectionHeading
          title="Our Favorites"
          subtitle="Discover the cakes our customers love."
        />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </Container>
    </section>
  );
}
