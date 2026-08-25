/**
 * Domain types shared across the storefront and (later) the admin panel.
 * These deliberately mirror the planned database tables so that swapping the
 * seed data for real queries in Phase 3 requires no component changes.
 */

export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  categorySlug: string;
  imageUrl: string;
  isNew: boolean;
  inStock: boolean;
  featured: boolean;
};

export type Testimonial = {
  id: string;
  author: string;
  rating: number; // 1–5
  content: string;
};

export type FeatureHighlight = {
  title: string;
  description: string;
};

// --- Settings (parsed from the site_settings JSON store) ---

export type BrandSettings = {
  name: string;
  nameAccent: string;
  tagline: string;
  description: string;
  location: string;
  currency: string;
  announcement: string;
};

export type ContactSettings = {
  address: string;
  phone: string;
  email: string;
  hours: string;
};

export type HeroSettings = {
  title: string;
  titleAccent: string;
  subtitle: string;
  description: string;
  imageUrl: string;
};

export type DeliverySettings = {
  points: string[];
  location: string;
};

// --- Navigation & footer (editable from the admin) ---

export type NavChild = { label: string; href: string };
export type NavItem = { label: string; href: string; children?: NavChild[] };

export type FooterLink = { label: string; href: string };
export type FooterColumn = { title: string; links: FooterLink[] };
export type FooterSettings = { columns: FooterColumn[]; showNewsletter: boolean };

export type SocialSettings = { instagram: string; facebook: string; tiktok: string };
