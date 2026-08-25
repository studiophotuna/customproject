import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/site/SectionHeading";
import { ProductCarousel } from "@/components/site/ProductCarousel";
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
        <div className="mt-10">
          <ProductCarousel products={products} />
        </div>
      </Container>
    </section>
  );
}
