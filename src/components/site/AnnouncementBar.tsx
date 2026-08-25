import { MapPin } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { getBrand } from "@/lib/data";

/** Slim top bar with the marketing message and store location (DB-driven). */
export async function AnnouncementBar() {
  const brand = await getBrand();
  if (!brand.announcement) return null;

  return (
    <div className="bg-brand text-on-brand text-xs">
      <Container className="flex h-9 items-center justify-center gap-4 sm:justify-between">
        <p className="truncate uppercase tracking-wide">{brand.announcement}</p>
        <span className="hidden shrink-0 items-center gap-1 sm:inline-flex">
          <MapPin className="h-3.5 w-3.5" />
          {brand.location}
        </span>
      </Container>
    </div>
  );
}
