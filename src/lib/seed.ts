/**
 * Placeholder storefront data for Phase 1.
 *
 * This stands in for the database until Phase 3, when these accessors are
 * replaced with real Supabase queries. Components import the accessor functions
 * (not the arrays) so the call sites stay identical once the data goes live.
 */

import type {
  Category,
  Product,
  Testimonial,
  FeatureHighlight,
} from "./types";

const categories: Category[] = [
  {
    id: "cat-birthday",
    slug: "birthday-cakes",
    name: "Birthday Cakes",
    description: "Made for unforgettable celebrations.",
    imageUrl: "/images/placeholder-cake.svg",
    sortOrder: 1,
  },
  {
    id: "cat-custom",
    slug: "custom-cakes",
    name: "Custom Cakes",
    description: "Your idea. Your colors. Your cake.",
    imageUrl: "/images/placeholder-cake.svg",
    sortOrder: 2,
  },
  {
    id: "cat-cheesecakes",
    slug: "cheesecakes",
    name: "Cheesecakes",
    description: "Creamy, indulgent and irresistible.",
    imageUrl: "/images/placeholder-cake.svg",
    sortOrder: 3,
  },
  {
    id: "cat-desserts",
    slug: "desserts",
    name: "Desserts",
    description: "Little treats for every sweet moment.",
    imageUrl: "/images/placeholder-cake.svg",
    sortOrder: 4,
  },
];

const products: Product[] = [
  {
    id: "p-ube-macapuno",
    slug: "ube-macapuno-cake",
    name: "Ube Macapuno Cake",
    description: "Filipino ube sponge with sweet macapuno.",
    price: 160,
    currency: "AED",
    categorySlug: "birthday-cakes",
    imageUrl: "/images/placeholder-cake.svg",
    isNew: false,
    inStock: true,
    featured: true,
  },
  {
    id: "p-filipino-cheesecake",
    slug: "filipino-style-cheesecake",
    name: "Filipino Style Cheesecake",
    description: "Rich, creamy cheesecake, Filipino style.",
    price: 110,
    currency: "AED",
    categorySlug: "cheesecakes",
    imageUrl: "/images/placeholder-cake.svg",
    isNew: false,
    inStock: true,
    featured: true,
  },
  {
    id: "p-dubai-choco",
    slug: "dubai-chewy-choco-cake",
    name: "Dubai Chewy Choco Cake",
    description: "Decadent chocolate with a chewy centre.",
    price: 150,
    currency: "AED",
    categorySlug: "birthday-cakes",
    imageUrl: "/images/placeholder-cake.svg",
    isNew: true,
    inStock: true,
    featured: true,
  },
  {
    id: "p-ube-cheesecake-tub",
    slug: "ube-cheesecake-tub",
    name: "Ube Cheesecake Tub",
    description: "Scoopable ube cheesecake in a tub.",
    price: 85,
    currency: "AED",
    categorySlug: "cheesecakes",
    imageUrl: "/images/placeholder-cake.svg",
    isNew: false,
    inStock: true,
    featured: true,
  },
  {
    id: "p-caramel-cheesecake",
    slug: "caramel-cheesecake",
    name: "Caramel Cheesecake",
    description: "Silky cheesecake with caramel topping.",
    price: 110,
    currency: "AED",
    categorySlug: "cheesecakes",
    imageUrl: "/images/placeholder-cake.svg",
    isNew: false,
    inStock: true,
    featured: true,
  },
  {
    id: "p-bento-cake",
    slug: "bento-cake",
    name: "Bento Cake",
    description: "Cute mini cake, personalised for you.",
    price: 70,
    currency: "AED",
    categorySlug: "custom-cakes",
    imageUrl: "/images/placeholder-cake.svg",
    isNew: false,
    inStock: true,
    featured: true,
  },
];

const testimonials: Testimonial[] = [
  {
    id: "t-1",
    author: "Happy Customer",
    rating: 5,
    content: "Beautiful cake, delicious flavor and amazing presentation!",
  },
  {
    id: "t-2",
    author: "Happy Customer",
    rating: 5,
    content: "Everything was perfect. The cake looked beautiful and tasted even better.",
  },
  {
    id: "t-3",
    author: "Happy Customer",
    rating: 5,
    content: "Highly recommended for celebrations!",
  },
];

const features: FeatureHighlight[] = [
  { title: "Freshly Made", description: "Prepared with care for every order." },
  { title: "Beautifully Crafted", description: "Thoughtfully designed to match your celebration." },
  { title: "Quality Ingredients", description: "Made with carefully selected ingredients." },
  { title: "Made For You", description: "Personalized options for your special moments." },
];

// --- Accessors (mirror the future async data layer) ---

export function getCategories(): Category[] {
  return [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getFeaturedProducts(): Product[] {
  return products.filter((p) => p.featured);
}

export function getProductsByCategory(slug: string): Product[] {
  return products.filter((p) => p.categorySlug === slug);
}

export function getTestimonials(): Testimonial[] {
  return testimonials;
}

export function getFeatureHighlights(): FeatureHighlight[] {
  return features;
}
