"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Cake,
  LayoutGrid,
  ListOrdered,
  Mail,
  MenuIcon,
  MessageSquareQuote,
  Palette,
  ShoppingCart,
  Tags,
  Users,
  Utensils,
  X,
} from "lucide-react";
import { signOut } from "@/app/admin/actions";
import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string; icon: React.ElementType; adminOnly?: boolean };

const links: NavLink[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutGrid },
  { href: "/admin/products", label: "Products", icon: Cake },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/requests", label: "Cake Requests", icon: Utensils },
  { href: "/admin/messages", label: "Messages", icon: Mail },
  { href: "/admin/testimonials", label: "Testimonials", icon: MessageSquareQuote },
  { href: "/admin/subscribers", label: "Subscribers", icon: ListOrdered },
  { href: "/admin/settings", label: "Settings", icon: Palette },
  { href: "/admin/users", label: "Users & Roles", icon: Users, adminOnly: true },
];

export function Sidebar({
  isAdmin,
  userLabel,
}: {
  isAdmin: boolean;
  userLabel: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const visible = links.filter((l) => !l.adminOnly || isAdmin);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <>
      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-line bg-background p-4 lg:hidden">
        <span className="font-semibold text-brand">Admin</span>
        <button aria-label="Menu" onClick={() => setOpen((o) => !o)}>
          {open ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
        </button>
      </div>

      <aside
        className={cn(
          "flex w-full shrink-0 flex-col border-r border-line bg-background lg:w-64",
          open ? "block" : "hidden lg:flex",
        )}
      >
        <div className="hidden border-b border-line p-5 lg:block">
          <p className="section-title text-lg font-bold text-brand">Admin</p>
          <p className="mt-1 truncate text-xs text-muted">{userLabel}</p>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {visible.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                  isActive(l.href)
                    ? "bg-brand text-on-brand"
                    : "text-foreground hover:bg-surface",
                )}
              >
                <Icon className="h-4 w-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line p-3">
          <Link
            href="/"
            className="mb-1 block rounded-md px-3 py-2 text-sm text-muted hover:bg-surface"
          >
            ← View site
          </Link>
          <form action={signOut}>
            <button className="w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-surface">
              Sign out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
