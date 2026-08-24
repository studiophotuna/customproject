import { MapPin } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { siteConfig } from "@/config/site";

/** Slim top bar with the marketing message and store location. */
export function AnnouncementBar() {
  return (
    <div className="bg-brand text-on-brand text-xs">
      <Container className="flex h-9 items-center justify-center gap-4 sm:justify-between">
        <p className="truncate uppercase tracking-wide">{siteConfig.announcement}</p>
        <span className="hidden shrink-0 items-center gap-1 sm:inline-flex">
          <MapPin className="h-3.5 w-3.5" />
          {siteConfig.location}
        </span>
      </Container>
    </div>
  );
}
