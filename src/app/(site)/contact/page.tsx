import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/site/PageHero";
import { ContactForm } from "@/components/site/forms/ContactForm";
import { getContact } from "@/lib/data";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with us about orders, custom cakes and events.",
};

export default async function ContactPage() {
  const contact = await getContact();
  const items = [
    { icon: MapPin, label: contact.address },
    { icon: Phone, label: contact.phone },
    { icon: Mail, label: contact.email },
    { icon: Clock, label: contact.hours },
  ];

  return (
    <>
      <PageHero title="Contact" subtitle="We'd love to hear from you." />
      <Container className="py-12">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="section-title text-2xl uppercase text-brand">Get in Touch</h2>
            <ul className="mt-6 space-y-4">
              {items.map((it, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-foreground">
                  <it.icon className="h-5 w-5 shrink-0 text-brand" />
                  {it.label}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="section-title mb-6 text-2xl uppercase text-brand">
              Send a Message
            </h2>
            <ContactForm />
          </div>
        </div>
      </Container>
    </>
  );
}
