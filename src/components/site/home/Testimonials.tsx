import { Quote, Star } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/site/SectionHeading";
import { getTestimonials } from "@/lib/seed";

export function Testimonials() {
  const testimonials = getTestimonials();
  return (
    <section className="bg-surface py-16">
      <Container>
        <SectionHeading title="Sweet Words From Our Customers" />
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure
              key={t.id}
              className="flex flex-col items-center gap-3 rounded-card border border-line bg-background p-6 text-center"
            >
              <Quote className="h-6 w-6 text-brand/40" />
              <div className="flex gap-0.5 text-brand">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <blockquote className="text-sm text-foreground">{t.content}</blockquote>
              <figcaption className="text-xs font-medium text-muted">— {t.author}</figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
}
