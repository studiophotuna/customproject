import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { FacebookIcon, InstagramIcon, TikTokIcon } from "@/components/ui/SocialIcons";
import { NewsletterForm } from "@/components/site/forms/NewsletterForm";
import { Logo } from "@/components/site/Logo";
import { siteConfig } from "@/config/site";

const shopLinks = [
  { label: "All Cakes", href: "/shop" },
  { label: "Birthday Cakes", href: "/shop/birthday-cakes" },
  { label: "Custom Cakes", href: "/shop/custom-cakes" },
  { label: "Cheesecakes", href: "/shop/cheesecakes" },
  { label: "Desserts", href: "/shop/desserts" },
];

const infoLinks = [
  { label: "About Us", href: "/about" },
  { label: "Custom Cakes", href: "/custom-cakes" },
  { label: "Weddings & Events", href: "/weddings-events" },
  { label: "Delivery & Pickup", href: "/delivery" },
  { label: "Contact Us", href: "/contact" },
  { label: "FAQ", href: "/faq" },
];

export function Footer() {
  return (
    <footer className="mt-auto bg-surface">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted">{siteConfig.tagline}</p>
          <div className="mt-4 flex gap-3">
            <Link href="#" aria-label="Instagram" className="text-foreground hover:text-brand">
              <InstagramIcon className="h-5 w-5" />
            </Link>
            <Link href="#" aria-label="Facebook" className="text-foreground hover:text-brand">
              <FacebookIcon className="h-5 w-5" />
            </Link>
            <Link href="#" aria-label="TikTok" className="text-foreground hover:text-brand">
              <TikTokIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <FooterCol title="Shop" links={shopLinks} />
        <FooterCol title="Information" links={infoLinks} />

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">Contact</h3>
          <ul className="space-y-2 text-sm text-muted">
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-brand" />
              {siteConfig.contact.address}
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-brand" />
              {siteConfig.contact.phone}
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-brand" />
              {siteConfig.contact.email}
            </li>
            <li className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-brand" />
              {siteConfig.contact.hours}
            </li>
          </ul>
        </div>

        <div className="sm:col-span-2 lg:col-span-1">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">Newsletter</h3>
          <p className="mb-3 text-sm text-muted">
            Be the first to know about new flavors, offers and more!
          </p>
          <NewsletterForm />
        </div>
      </Container>

      <div className="border-t border-line">
        <Container className="py-4">
          <p className="text-center text-xs text-muted">
            © {new Date().getFullYear()} {siteConfig.name} {siteConfig.nameAccent}. All Rights Reserved.
          </p>
        </Container>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">{title}</h3>
      <ul className="space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-muted hover:text-brand">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
