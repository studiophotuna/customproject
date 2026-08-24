"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/site/Logo";
import { useCart } from "@/components/cart/CartProvider";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Sticky storefront header: wordmark, primary nav (with a Shop dropdown),
 * utility icons (search / account / cart), an Order Now CTA, and a mobile menu.
 * Cart count is a placeholder until the cart is wired up in Phase 5.
 */
export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/95 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 lg:flex">
          {siteConfig.nav.map((item) =>
            item.children ? (
              <div key={item.href} className="group relative">
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1 text-sm text-foreground hover:text-brand"
                >
                  {item.label}
                  <ChevronDown className="h-4 w-4" />
                </Link>
                <div className="invisible absolute left-0 top-full pt-3 opacity-0 transition group-hover:visible group-hover:opacity-100">
                  <ul className="min-w-48 rounded-card border border-line bg-background p-2 shadow-lg">
                    {item.children.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          className="block rounded-md px-3 py-2 text-sm text-foreground hover:bg-surface hover:text-brand"
                        >
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-foreground hover:text-brand"
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        {/* Utilities */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button aria-label="Search" className="rounded-md p-2 text-foreground hover:bg-surface">
            <Search className="h-5 w-5" />
          </button>
          <Link href="/account" aria-label="Account" className="rounded-md p-2 text-foreground hover:bg-surface">
            <User className="h-5 w-5" />
          </Link>
          <Link
            href="/cart"
            aria-label="Cart"
            className="relative rounded-md p-2 text-foreground hover:bg-surface"
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-semibold text-on-brand">
                {count}
              </span>
            )}
          </Link>
          <ButtonLink href="/shop" size="sm" className="ml-1 hidden sm:inline-flex">
            Order Now
          </ButtonLink>
          <button
            aria-label="Menu"
            className="rounded-md p-2 text-foreground hover:bg-surface lg:hidden"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </Container>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-line bg-background lg:hidden">
          <Container className="py-3">
            <ul className="flex flex-col">
              {siteConfig.nav.map((item) => (
                <li key={item.href} className="border-b border-line/60 last:border-0">
                  {item.children ? (
                    <>
                      <button
                        className="flex w-full items-center justify-between py-3 text-sm"
                        onClick={() => setShopOpen((o) => !o)}
                      >
                        {item.label}
                        <ChevronDown className={cn("h-4 w-4 transition", shopOpen && "rotate-180")} />
                      </button>
                      {shopOpen && (
                        <ul className="pb-2 pl-4">
                          {item.children.map((child) => (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                className="block py-2 text-sm text-muted hover:text-brand"
                                onClick={() => setMobileOpen(false)}
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      className="block py-3 text-sm"
                      onClick={() => setMobileOpen(false)}
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            <ButtonLink href="/shop" className="mt-3 w-full">
              Order Now
            </ButtonLink>
          </Container>
        </div>
      )}
    </header>
  );
}
