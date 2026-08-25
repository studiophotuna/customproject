import { AnnouncementBar } from "@/components/site/AnnouncementBar";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { CartProvider } from "@/components/cart/CartProvider";
import { getBrand, getLogoUrl, getNavigation } from "@/lib/data";

/** Layout for the public storefront: announcement bar, header, content, footer. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [nav, brand, logoUrl] = await Promise.all([
    getNavigation(),
    getBrand(),
    getLogoUrl(),
  ]);

  return (
    <CartProvider>
      <AnnouncementBar />
      <Header nav={nav} brandName={brand.name} brandAccent={brand.nameAccent} logoUrl={logoUrl} />
      <main className="flex-1">{children}</main>
      <Footer />
    </CartProvider>
  );
}
