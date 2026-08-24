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
