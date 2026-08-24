/**
 * Site configuration — brand identity, navigation, and store info.
 *
 * Like the theme, these values are stubbed here for Phase 1 and will move to
 * the database (`site_settings`) so the admin panel can edit them. Keeping the
 * shape stable now means the storefront components won't change when the data
 * source switches.
 */

export type NavItem = {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
};

export type SiteConfig = {
  name: string;
  nameAccent: string; // the scripted word ("Cakes")
  tagline: string;
  description: string;
  location: string;
  currency: string;
  announcement: string;
  nav: NavItem[];
  contact: {
    address: string;
    phone: string;
    email: string;
    hours: string;
  };
  socials: { label: string; href: string }[];
};

export const siteConfig: SiteConfig = {
  name: "La JAYSIEDEL",
  nameAccent: "Cakes",
  tagline: "Sweet moments, beautifully made.",
  description:
    "Handcrafted cakes and desserts made to make every celebration a little sweeter.",
  location: "Dubai, UAE",
  currency: "AED",
  announcement:
    "Handcrafted cakes & desserts made to make every celebration sweeter.",
  nav: [
    { label: "Home", href: "/" },
    {
      label: "Shop",
      href: "/shop",
      children: [
        { label: "Birthday Cakes", href: "/shop/birthday-cakes" },
        { label: "Custom Cakes", href: "/shop/custom-cakes" },
        { label: "Cheesecakes", href: "/shop/cheesecakes" },
        { label: "Desserts", href: "/shop/desserts" },
      ],
    },
    { label: "Custom Cakes", href: "/custom-cakes" },
    { label: "Weddings & Events", href: "/weddings-events" },
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  contact: {
    address: "Dubai, UAE",
    phone: "+971 50 123 4567",
    email: "info@lajaysiedelcakes.com",
    hours: "Mon – Sun: 9:00 AM – 8:00 PM",
  },
  socials: [
    { label: "Instagram", href: "#" },
    { label: "Facebook", href: "#" },
    { label: "TikTok", href: "#" },
  ],
};
