import Image from "next/image";
import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/site/PageHero";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Weddings & Events",
  description: "Cakes and desserts for weddings, corporate events and celebrations.",
};

const occasions = [
  { title: "Weddings", text: "Elegant tiered cakes and dessert tables for your big day." },
  { title: "Corporate Events", text: "Branded cakes and catering-friendly desserts for any gathering." },
  { title: "Celebrations", text: "Birthdays, anniversaries, showers — made memorable." },
];

export default function WeddingsEventsPage() {
  return (
    <>
      <PageHero
        title="Weddings & Events"
        subtitle="From intimate gatherings to unforgettable celebrations, we'll help make your event sweeter."
      />
      <Container className="py-12">
        <div className="relative mb-12 h-64 overflow-hidden rounded-card sm:h-80">
          <Image
            src="/images/placeholder-cake.svg"
            alt="Wedding cake"
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {occasions.map((o) => (
            <div key={o.title} className="rounded-card border border-line p-6">
              <h3 className="section-title text-lg text-brand">{o.title}</h3>
              <p className="mt-2 text-sm text-muted">{o.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-card bg-surface p-8 text-center">
          <h2 className="section-title text-2xl uppercase text-brand">
            Planning something special?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted">
            Tell us about your event and we&apos;ll put together the perfect cakes and
            desserts for the occasion.
          </p>
          <ButtonLink href="/contact" size="lg" className="mt-6 uppercase">
            Get in Touch
          </ButtonLink>
        </div>
      </Container>
    </>
  );
}
