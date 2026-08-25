"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { saveNavigation, type ActionState } from "@/app/admin/(panel)/settings/actions";
import type { NavItem } from "@/lib/types";

export function NavEditor({ initial }: { initial: NavItem[] }) {
  const [items, setItems] = useState<NavItem[]>(initial);
  const [state, action, pending] = useActionState<ActionState, FormData>(saveNavigation, null);

  const update = (i: number, patch: Partial<NavItem>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const updateChild = (i: number, ci: number, patch: Partial<NavItem>) =>
    setItems((prev) =>
      prev.map((it, idx) =>
        idx === i
          ? { ...it, children: (it.children ?? []).map((c, cx) => (cx === ci ? { ...c, ...patch } : c)) }
          : it,
      ),
    );

  return (
    <form action={action} className="rounded-card border border-line bg-background p-5">
      <div className="mb-4">
        <h2 className="font-semibold text-foreground">Navigation Menu</h2>
        <p className="text-sm text-muted">The main header menu. Add sub-items to create a dropdown.</p>
      </div>

      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={i} className="rounded-md border border-line p-3">
            <div className="flex gap-2">
              <Input
                placeholder="Label"
                value={item.label}
                onChange={(e) => update(i, { label: e.target.value })}
              />
              <Input
                placeholder="/link"
                value={item.href}
                onChange={(e) => update(i, { href: e.target.value })}
              />
              <button
                type="button"
                aria-label="Remove item"
                onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}
                className="shrink-0 rounded-md border border-line px-2 text-muted hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Dropdown children */}
            <div className="mt-3 space-y-2 pl-4">
              {(item.children ?? []).map((child, ci) => (
                <div key={ci} className="flex gap-2">
                  <Input
                    placeholder="Sub-label"
                    value={child.label}
                    onChange={(e) => updateChild(i, ci, { label: e.target.value })}
                  />
                  <Input
                    placeholder="/link"
                    value={child.href}
                    onChange={(e) => updateChild(i, ci, { href: e.target.value })}
                  />
                  <button
                    type="button"
                    aria-label="Remove sub-item"
                    onClick={() =>
                      update(i, { children: (item.children ?? []).filter((_, cx) => cx !== ci) })
                    }
                    className="shrink-0 rounded-md border border-line px-2 text-muted hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  update(i, { children: [...(item.children ?? []), { label: "", href: "" }] })
                }
                className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
              >
                <Plus className="h-3 w-3" /> Add sub-item
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setItems((p) => [...p, { label: "", href: "" }])}
        className="mt-4 inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-sm hover:bg-surface"
      >
        <Plus className="h-4 w-4" /> Add menu item
      </button>

      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save navigation"}
        </Button>
        {state?.ok && <span className="text-sm text-brand">Saved.</span>}
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
