/**
 * Theme configuration — the single source of truth for brand look & feel.
 *
 * This is intentionally decoupled from components: every color/radius token is
 * emitted as a CSS custom property at runtime (see `themeToCssVars`), so the
 * same codebase can be rebranded per client. In a later phase these values are
 * loaded from the database (`site_settings`) and injected, letting a
 * non-technical owner change the palette from the admin panel without a deploy.
 */

export type Theme = {
  /** Brand / primary accent (the teal in the reference design). */
  brand: string;
  brandDark: string;
  brandLight: string;
  /** Contrast color for text/icons placed on a brand background. */
  onBrand: string;
  /** Page + surface backgrounds. */
  background: string;
  surface: string;
  surfaceMuted: string;
  /** Text colors. */
  foreground: string;
  muted: string;
  /** Borders & lines. */
  border: string;
  /** Accent used for "NEW"/sale badges. */
  accent: string;
  /** Corner radius applied to cards/buttons. */
  radius: string;
};

/** Default theme — matches the La JAYSIEDEL Cakes reference (teal + cream). */
export const defaultTheme: Theme = {
  brand: "#158a8a",
  brandDark: "#0e6b6b",
  brandLight: "#e3f1f0",
  onBrand: "#ffffff",
  background: "#ffffff",
  surface: "#faf7f2",
  surfaceMuted: "#f3ede4",
  foreground: "#1f2937",
  muted: "#6b7280",
  border: "#e7e2d8",
  accent: "#0fb5ac",
  radius: "0.75rem",
};

/**
 * Convert a Theme into the CSS custom properties consumed by globals.css.
 * Kept as a plain map so it can be serialized into a <style> tag on the server.
 */
export function themeToCssVars(theme: Theme): Record<string, string> {
  return {
    "--brand": theme.brand,
    "--brand-dark": theme.brandDark,
    "--brand-light": theme.brandLight,
    "--on-brand": theme.onBrand,
    "--background": theme.background,
    "--surface": theme.surface,
    "--surface-muted": theme.surfaceMuted,
    "--foreground": theme.foreground,
    "--muted": theme.muted,
    "--border": theme.border,
    "--accent": theme.accent,
    "--radius": theme.radius,
  };
}

/**
 * Resolve the active theme. For now this returns the default; in Phase 2+ it
 * will read overrides from the database and merge them over `defaultTheme`.
 */
export function getActiveTheme(): Theme {
  return defaultTheme;
}
