import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { siteConfig } from "@/config/site";

export function Hero() {
  return (
    <section className="bg-surface">
      <Container className="grid items-center gap-8 py-12 lg:grid-cols-2 lg:py-20">
        <div>
          <h1 className="section-title text-4xl leading-tight text-brand sm:text-5xl">
            {siteConfig.name}
            <span
              className="mt-1 block text-5xl text-foreground sm:text-6xl"
              style={{ fontFamily: "var(--font-script), cursive" }}
            >
              {siteConfig.nameAccent}
            </span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-foreground">{siteConfig.tagline}</p>
          <p className="mt-3 max-w-md text-sm text-muted">{siteConfig.description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/shop" size="lg" className="uppercase">
              Shop Cakes
            </ButtonLink>
            <ButtonLink href="/custom-cakes" size="lg" variant="outline" className="uppercase">
              Custom Cake
            </ButtonLink>
          </div>
        </div>
        <div className="relative aspect-square w-full overflow-hidden rounded-card">
          <Image
            src="/images/placeholder-cake.svg"
            alt="Featured handcrafted cake"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      </Container>
    </section>
  );
}
