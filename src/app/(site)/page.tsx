import { Hero } from "@/components/site/home/Hero";
import { CategoryGrid } from "@/components/site/home/CategoryGrid";
import { FeaturedProducts } from "@/components/site/home/FeaturedProducts";
import { CustomCakeCTA } from "@/components/site/home/CustomCakeCTA";
import { FeatureHighlights } from "@/components/site/home/FeatureHighlights";
import { WeddingsFeature } from "@/components/site/home/WeddingsFeature";
import { Testimonials } from "@/components/site/home/Testimonials";
import { InstagramDelivery } from "@/components/site/home/InstagramDelivery";
import { BottomCTA } from "@/components/site/home/BottomCTA";

export default function HomePage() {
  return (
    <>
      <Hero />
      <CategoryGrid />
      <FeaturedProducts />
      <CustomCakeCTA />
      <FeatureHighlights />
      <WeddingsFeature />
      <Testimonials />
      <InstagramDelivery />
      <BottomCTA />
    </>
  );
}
