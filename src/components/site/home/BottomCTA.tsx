import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";

export function BottomCTA() {
  return (
    <section className="bg-brand py-16 text-on-brand">
      <Container className="text-center">
        <h2 className="section-title text-2xl uppercase sm:text-3xl">
          Make Your Next Celebration Sweeter
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-on-brand/90">
          Whether it&apos;s a birthday, wedding, corporate event or simply a sweet
          craving — there&apos;s always a reason for cake.
        </p>
        <ButtonLink
          href="/shop"
          size="lg"
          variant="outline"
          className="mt-6 border-on-brand bg-on-brand text-brand uppercase hover:bg-transparent hover:text-on-brand"
        >
          Shop Cakes
        </ButtonLink>
      </Container>
    </section>
  );
}
