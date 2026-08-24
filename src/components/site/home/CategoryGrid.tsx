import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/site/SectionHeading";
import { getCategories } from "@/lib/data";

export async function CategoryGrid() {
  const categories = await getCategories();
  return (
    <section className="py-16">
      <Container>
        <SectionHeading title="Find Your Perfect Sweet" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex flex-col overflow-hidden rounded-card border border-line bg-background"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={cat.imageUrl}
                  alt={cat.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 25vw"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col items-center gap-2 p-5 text-center">
                <h3 className="section-title text-sm font-semibold uppercase tracking-wide">
                  {cat.name}
                </h3>
                <p className="text-xs text-muted">{cat.description}</p>
                <Link
                  href={`/shop/${cat.slug}`}
                  className="mt-auto inline-flex items-center gap-1 pt-2 text-xs font-semibold uppercase tracking-wide text-brand hover:gap-2"
                >
                  Shop Now <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
