import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";

export function CustomCakeCTA() {
  return (
    <section className="py-16">
      <Container>
        <div className="grid overflow-hidden rounded-card bg-surface-muted lg:grid-cols-2">
          <div className="flex flex-col justify-center gap-4 p-8 sm:p-12">
            <h2 className="section-title text-2xl uppercase text-brand sm:text-3xl">
              Made Just For You
            </h2>
            <p className="text-sm font-medium text-foreground">
              Every celebration is different.
            </p>
            <p className="max-w-md text-sm text-muted">
              Tell us your vision, choose your colors and flavors, and let us
              create something truly special for your occasion.
            </p>
            <div>
              <ButtonLink href="/custom-cakes" size="lg" className="uppercase">
                Request a Custom Cake
              </ButtonLink>
            </div>
            <p className="text-xs text-muted">
              * Please allow advance notice for customized cake orders.
            </p>
          </div>
          <div className="relative min-h-64">
            <Image
              src="/images/placeholder-cake.svg"
              alt="Custom cake"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
