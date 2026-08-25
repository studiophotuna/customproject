import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { FacebookIcon, InstagramIcon, TikTokIcon } from "@/components/ui/SocialIcons";
import { NewsletterForm } from "@/components/site/forms/NewsletterForm";
import { Logo } from "@/components/site/Logo";
import { getBrand, getContact, getFooter, getSocials } from "@/lib/data";
import type { FooterColumn } from "@/lib/types";

export async function Footer() {
  const [brand, contact, footer, socials] = await Promise.all([
    getBrand(),
    getContact(),
    getFooter(),
    getSocials(),
  ]);

  const socialLinks = [
    { href: socials.instagram, label: "Instagram", Icon: InstagramIcon },
    { href: socials.facebook, label: "Facebook", Icon: FacebookIcon },
    { href: socials.tiktok, label: "TikTok", Icon: TikTokIcon },
  ].filter((s) => s.href);

  return (
    <footer className="mt-auto bg-surface">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-1">
          <Logo name={brand.name} accent={brand.nameAccent} />
          <p className="mt-4 max-w-xs text-sm text-muted">{brand.tagline}</p>
          {socialLinks.length > 0 && (
            <div className="mt-4 flex gap-3">
              {socialLinks.map(({ href, label, Icon }) => (
                <Link
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground hover:text-brand"
                >
                  <Icon className="h-5 w-5" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {footer.columns.map((col) => (
          <FooterCol key={col.title} column={col} />
        ))}

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">Contact</h3>
          <ul className="space-y-2 text-sm text-muted">
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-brand" />
              {contact.address}
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-brand" />
              {contact.phone}
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-brand" />
              {contact.email}
            </li>
            <li className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-brand" />
              {contact.hours}
            </li>
          </ul>
        </div>

        {footer.showNewsletter && (
          <div className="sm:col-span-2 lg:col-span-1">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">Newsletter</h3>
            <p className="mb-3 text-sm text-muted">
              Be the first to know about new flavors, offers and more!
            </p>
            <NewsletterForm />
          </div>
        )}
      </Container>

      <div className="border-t border-line">
        <Container className="py-4">
          <p className="text-center text-xs text-muted">
            © {new Date().getFullYear()} {brand.name} {brand.nameAccent}. All Rights Reserved.
          </p>
        </Container>
      </div>
    </footer>
  );
}

function FooterCol({ column }: { column: FooterColumn }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide">{column.title}</h3>
      <ul className="space-y-2 text-sm">
        {column.links.map((l, i) => (
          <li key={`${l.href}-${i}`}>
            <Link href={l.href} className="text-muted hover:text-brand">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
