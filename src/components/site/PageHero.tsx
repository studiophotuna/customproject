import { Container } from "@/components/ui/Container";

/** Compact banner used at the top of interior pages. */
export function PageHero({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="bg-surface">
      <Container className="py-12 text-center sm:py-16">
        <h1 className="section-title text-3xl uppercase text-brand sm:text-4xl">{title}</h1>
        {subtitle && (
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted">{subtitle}</p>
        )}
      </Container>
    </section>
  );
}
