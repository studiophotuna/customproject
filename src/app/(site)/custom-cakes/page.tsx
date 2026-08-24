import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/site/PageHero";
import { CustomCakeForm } from "@/components/site/forms/CustomCakeForm";

export const metadata: Metadata = {
  title: "Custom Cakes",
  description: "Request a custom cake designed around your celebration.",
};

const steps = [
  { n: "1", title: "Share your vision", text: "Tell us your occasion, flavors, colors and theme." },
  { n: "2", title: "We design & quote", text: "We'll suggest options and send you a quote." },
  { n: "3", title: "Handcrafted for you", text: "We bake, decorate and get it ready for your day." },
];

export default function CustomCakesPage() {
  return (
    <>
      <PageHero
        title="Custom Cakes"
        subtitle="Every celebration is different. Tell us your vision and we'll create something truly special."
      />
      <Container className="py-12">
        <div className="mb-12 grid gap-6 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-card border border-line p-6 text-center">
              <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-brand text-on-brand">
                {s.n}
              </div>
              <h3 className="font-medium text-foreground">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto max-w-2xl">
          <h2 className="section-title mb-6 text-center text-2xl uppercase text-brand">
            Request a Custom Cake
          </h2>
          <CustomCakeForm />
          <p className="mt-4 text-center text-xs text-muted">
            * Please allow advance notice for customized cake orders.
          </p>
        </div>
      </Container>
    </>
  );
}
