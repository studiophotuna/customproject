import { AdminHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { getBrand, getContact, getHero, getDelivery, getTheme } from "@/lib/data";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [brand, contact, hero, delivery, theme] = await Promise.all([
    getBrand(),
    getContact(),
    getHero(),
    getDelivery(),
    getTheme(),
  ]);

  return (
    <>
      <AdminHeader
        title="Settings"
        description="Edit your brand, contact info, homepage content and theme. Changes apply site-wide."
      />

      <div className="grid gap-6">
        <SettingsForm
          settingKey="brand"
          title="Brand"
          description="Name, tagline and the announcement bar."
          fields={[
            { name: "name", label: "Name", value: brand.name },
            { name: "nameAccent", label: "Accent word", value: brand.nameAccent },
            { name: "tagline", label: "Tagline", value: brand.tagline },
            { name: "location", label: "Location", value: brand.location },
            { name: "currency", label: "Currency", value: brand.currency },
            { name: "announcement", label: "Announcement bar", value: brand.announcement, type: "textarea" },
            { name: "description", label: "Description", value: brand.description, type: "textarea" },
          ]}
        />

        <SettingsForm
          settingKey="hero"
          title="Homepage Hero"
          fields={[
            { name: "title", label: "Title", value: hero.title },
            { name: "titleAccent", label: "Title accent", value: hero.titleAccent },
            { name: "subtitle", label: "Subtitle", value: hero.subtitle },
            { name: "imageUrl", label: "Image URL", value: hero.imageUrl },
            { name: "description", label: "Description", value: hero.description, type: "textarea" },
          ]}
        />

        <SettingsForm
          settingKey="contact"
          title="Contact"
          fields={[
            { name: "address", label: "Address", value: contact.address },
            { name: "phone", label: "Phone", value: contact.phone },
            { name: "email", label: "Email", value: contact.email },
            { name: "hours", label: "Opening hours", value: contact.hours },
          ]}
        />

        <SettingsForm
          settingKey="delivery"
          title="Delivery"
          columns={1}
          fields={[
            { name: "location", label: "Location", value: delivery.location },
            {
              name: "points",
              label: "Delivery points (one per line)",
              value: delivery.points.join("\n"),
              type: "textarea",
            },
          ]}
        />

        <SettingsForm
          settingKey="theme"
          title="Theme"
          description="Brand colors used across the whole site."
          fields={[
            { name: "brand", label: "Brand", value: theme.brand, type: "color" },
            { name: "brandDark", label: "Brand dark", value: theme.brandDark, type: "color" },
            { name: "brandLight", label: "Brand light", value: theme.brandLight, type: "color" },
            { name: "accent", label: "Accent (badges)", value: theme.accent, type: "color" },
            { name: "surface", label: "Surface", value: theme.surface, type: "color" },
            { name: "surfaceMuted", label: "Surface muted", value: theme.surfaceMuted, type: "color" },
            { name: "foreground", label: "Text", value: theme.foreground, type: "color" },
            { name: "muted", label: "Muted text", value: theme.muted, type: "color" },
            { name: "background", label: "Background", value: theme.background, type: "color" },
            { name: "onBrand", label: "On-brand text", value: theme.onBrand, type: "color" },
            { name: "border", label: "Border", value: theme.border, type: "color" },
            { name: "radius", label: "Corner radius", value: theme.radius, type: "text" },
          ]}
        />
      </div>
    </>
  );
}
