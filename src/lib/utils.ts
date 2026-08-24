/** Tiny className joiner (avoids a clsx dependency for now). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Format a price with its currency code, e.g. "AED 160.00". */
export function formatPrice(amount: number, currency = "AED"): string {
  return `${currency} ${amount.toFixed(2)}`;
}
