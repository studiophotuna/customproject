import type { Metadata } from "next";
import { Inter, Playfair_Display, Dancing_Script } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { getActiveTheme, themeToCssVars } from "@/config/theme";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Serialize the active theme into CSS variables. This is the seam that later
  // reads from the database so the admin panel can rebrand the whole site.
  const themeVars = themeToCssVars(getActiveTheme());
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
