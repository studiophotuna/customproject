import "server-only";
import { createClient } from "@/lib/supabase/server";
import { siteConfig } from "@/config/site";
import { defaultTheme, type Theme } from "@/config/theme";
import type {
  Category,
  Product,
  Testimonial,
  FeatureHighlight,
  BrandSettings,
  ContactSettings,
  HeroSettings,
  DeliverySettings,
  NavItem,
  FooterSettings,
  SocialSettings,
} from "@/lib/types";
import type { Tables } from "@/lib/database.types";

// --- Row → domain mappers ---

type ProductRow = Tables<"products"> & {
  categories?: { slug: string | null } | null;
};

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? "",
    price: Number(row.price),
    currency: row.currency,
    categorySlug: row.categories?.slug ?? "",
    imageUrl: row.image_url ?? "/images/placeholder-cake.svg",
    isNew: row.is_new,
    inStock: row.in_stock,
    featured: row.featured,
  };
}

function mapCategory(row: Tables<"categories">): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? "",
    imageUrl: row.image_url ?? "/images/placeholder-cake.svg",
    sortOrder: row.sort_order,
  };
}

function mapTestimonial(row: Tables<"testimonials">): Testimonial {
  return {
    id: row.id,
    author: row.author,
    rating: row.rating,
    content: row.content,
  };
}

const PRODUCT_SELECT = "*, categories(slug)";

// --- Catalog ---

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []).map(mapCategory);
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .eq("featured", true)
    .order("sort_order");
  return (data ?? []).map(mapProduct);
}

export async function getAllProducts(): Promise<Product[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []).map(mapProduct);
}

export async function getProductsByCategory(slug: string): Promise<Product[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .eq("categories.slug", slug)
    .not("category_id", "is", null)
    .order("sort_order");
  return (data ?? []).map(mapProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data ? mapProduct(data as ProductRow) : null;
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data ? mapCategory(data) : null;
}

export async function getTestimonials(): Promise<Testimonial[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("testimonials")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []).map(mapTestimonial);
}

// --- Settings ---

/** Fetch a single settings row's JSON value, or null if unset. */
async function getSetting<T>(key: string): Promise<T | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return (data?.value as T) ?? null;
}

export async function getBrand(): Promise<BrandSettings> {
  const v = await getSetting<Partial<BrandSettings>>("brand");
  return {
    name: v?.name ?? siteConfig.name,
    nameAccent: v?.nameAccent ?? siteConfig.nameAccent,
    tagline: v?.tagline ?? siteConfig.tagline,
    description: v?.description ?? siteConfig.description,
    location: v?.location ?? siteConfig.location,
    currency: v?.currency ?? siteConfig.currency,
    announcement: v?.announcement ?? siteConfig.announcement,
  };
}

/** Uploaded logo image URL, or "" to use the text wordmark. */
export async function getLogoUrl(): Promise<string> {
  const v = await getSetting<{ url?: string }>("logo");
  return v?.url ?? "";
}

export async function getContact(): Promise<ContactSettings> {
  const v = await getSetting<Partial<ContactSettings>>("contact");
  return {
    address: v?.address ?? siteConfig.contact.address,
    phone: v?.phone ?? siteConfig.contact.phone,
    email: v?.email ?? siteConfig.contact.email,
    hours: v?.hours ?? siteConfig.contact.hours,
  };
}

export async function getHero(): Promise<HeroSettings> {
  const v = await getSetting<Partial<HeroSettings>>("hero");
  return {
    title: v?.title ?? siteConfig.name,
    titleAccent: v?.titleAccent ?? siteConfig.nameAccent,
    subtitle: v?.subtitle ?? siteConfig.tagline,
    description: v?.description ?? siteConfig.description,
    imageUrl: v?.imageUrl ?? "/images/placeholder-cake.svg",
  };
}

export async function getDelivery(): Promise<DeliverySettings> {
  const v = await getSetting<Partial<DeliverySettings>>("delivery");
  return {
    points: v?.points ?? [
      "Pickup Available",
      "Delivery Available",
      "Delivery charges apply based on distance.",
    ],
    location: v?.location ?? siteConfig.location,
  };
}

/** Active theme: DB overrides merged over the built-in defaults. */
export async function getTheme(): Promise<Theme> {
  const v = await getSetting<Partial<Theme>>("theme");
  return { ...defaultTheme, ...(v ?? {}) };
}

/** Primary navigation (admin-editable), falling back to the built-in menu. */
export async function getNavigation(): Promise<NavItem[]> {
  const v = await getSetting<{ items?: NavItem[] }>("navigation");
  const items = v?.items;
  return items && items.length > 0 ? items : siteConfig.nav;
}

const DEFAULT_FOOTER: FooterSettings = {
  showNewsletter: true,
  columns: [
    {
      title: "Shop",
      links: [
        { label: "All Cakes", href: "/shop" },
        { label: "Birthday Cakes", href: "/shop/birthday-cakes" },
        { label: "Custom Cakes", href: "/shop/custom-cakes" },
        { label: "Cheesecakes", href: "/shop/cheesecakes" },
        { label: "Desserts", href: "/shop/desserts" },
      ],
    },
    {
      title: "Information",
      links: [
        { label: "About Us", href: "/about" },
        { label: "Custom Cakes", href: "/custom-cakes" },
        { label: "Weddings & Events", href: "/weddings-events" },
        { label: "Delivery & Pickup", href: "/delivery" },
        { label: "Contact Us", href: "/contact" },
        { label: "FAQ", href: "/faq" },
      ],
    },
  ],
};

/** Footer columns + newsletter toggle (admin-editable). */
export async function getFooter(): Promise<FooterSettings> {
  const v = await getSetting<Partial<FooterSettings>>("footer");
  return {
    columns: v?.columns && v.columns.length > 0 ? v.columns : DEFAULT_FOOTER.columns,
    showNewsletter: v?.showNewsletter ?? DEFAULT_FOOTER.showNewsletter,
  };
}

/** Social links (admin-editable). Empty string hides that icon. */
export async function getSocials(): Promise<SocialSettings> {
  const v = await getSetting<Partial<SocialSettings>>("socials");
  return {
    instagram: v?.instagram ?? "",
    facebook: v?.facebook ?? "",
    tiktok: v?.tiktok ?? "",
  };
}

// --- Static content (not yet in the DB) ---

export function getFeatureHighlights(): FeatureHighlight[] {
  return [
    { title: "Freshly Made", description: "Prepared with care for every order." },
    { title: "Beautifully Crafted", description: "Thoughtfully designed to match your celebration." },
    { title: "Quality Ingredients", description: "Made with carefully selected ingredients." },
    { title: "Made For You", description: "Personalized options for your special moments." },
  ];
}
