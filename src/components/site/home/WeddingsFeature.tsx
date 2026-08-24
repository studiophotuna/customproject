import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";

const occasions = ["Birthdays", "Weddings", "Corporate Events", "Celebrations"];

export function WeddingsFeature() {
  return (
    <section className="py-16">
      <Container>
        <div className="relative overflow-hidden rounded-card">
          <Image
            src="/images/placeholder-cake.svg"
            alt="Wedding cake"
            width={1200}
            height={500}
            className="h-72 w-full object-cover sm:h-96"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-surface/95 via-surface/70 to-transparent" />
          <div className="absolute inset-0 flex flex-col items-end justify-center p-6 text-right sm:p-12">
            <div className="max-w-md">
              <h2 className="section-title text-2xl uppercase text-brand sm:text-3xl">
                For Life&apos;s Big Moments
              </h2>
              <p className="mt-3 text-sm text-foreground">
                {occasions.join("  •  ")}
              </p>
              <p className="mt-3 text-sm text-muted">
                From intimate gatherings to unforgettable celebrations, we&apos;ll
                help make your event sweeter.
              </p>
              <ButtonLink href="/weddings-events" size="lg" className="mt-6 uppercase">
                Weddings &amp; Events
              </ButtonLink>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
