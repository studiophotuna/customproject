import { CakeSlice, Heart, Leaf, Sparkles } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { getFeatureHighlights } from "@/lib/seed";

const icons = [CakeSlice, Sparkles, Leaf, Heart];

export function FeatureHighlights() {
  const features = getFeatureHighlights();
  return (
    <section className="border-y border-line py-12">
      <Container>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => {
            const Icon = icons[i % icons.length];
            return (
              <div key={feature.title} className="flex items-start gap-3">
                <Icon className="h-8 w-8 shrink-0 text-brand" />
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-brand">
                    {feature.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
