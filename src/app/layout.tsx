import type { Metadata } from "next";
import { Inter, Playfair_Display, Dancing_Script } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { themeToCssVars } from "@/config/theme";
import { getTheme } from "@/lib/data";

const sans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const serif = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

const script = Dancing_Script({
  variable: "--font-script",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} ${siteConfig.nameAccent} — ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name} ${siteConfig.nameAccent}`,
  },
  description: siteConfig.description,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Serialize the active theme (DB overrides merged over defaults) into CSS
  // variables, so the admin panel can rebrand the whole site without a deploy.
  const themeVars = themeToCssVars(await getTheme());
  const themeCss = `:root{${Object.entries(themeVars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";")}}`;

  return (
    <html
      lang="en"
      className={`${sans.variable} ${serif.variable} ${script.variable} h-full antialiased`}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
