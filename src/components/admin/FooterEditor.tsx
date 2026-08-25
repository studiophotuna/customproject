"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { saveFooter, type ActionState } from "@/app/admin/(panel)/settings/actions";
import type { FooterColumn } from "@/lib/types";

export function FooterEditor({
  initialColumns,
  initialNewsletter,
}: {
  initialColumns: FooterColumn[];
  initialNewsletter: boolean;
}) {
  const [columns, setColumns] = useState<FooterColumn[]>(initialColumns);
  const [state, action, pending] = useActionState<ActionState, FormData>(saveFooter, null);

  const setCol = (i: number, patch: Partial<FooterColumn>) =>
    setColumns((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const setLink = (i: number, li: number, patch: Partial<{ label: string; href: string }>) =>
    setColumns((prev) =>
      prev.map((c, idx) =>
        idx === i ? { ...c, links: c.links.map((l, lx) => (lx === li ? { ...l, ...patch } : l)) } : c,
      ),
    );

  return (
    <form action={action} className="rounded-card border border-line bg-background p-5">
      <div className="mb-4">
        <h2 className="font-semibold text-foreground">Footer</h2>
        <p className="text-sm text-muted">Link columns shown in the site footer.</p>
      </div>

      <input type="hidden" name="columns" value={JSON.stringify(columns)} />

      <div className="grid gap-4 sm:grid-cols-2">
        {columns.map((col, i) => (
          <div key={i} className="rounded-md border border-line p-3">
            <div className="mb-2 flex gap-2">
              <Input
                placeholder="Column title"
                value={col.title}
                onChange={(e) => setCol(i, { title: e.target.value })}
              />
              <button
                type="button"
                aria-label="Remove column"
                onClick={() => setColumns((p) => p.filter((_, idx) => idx !== i))}
                className="shrink-0 rounded-md border border-line px-2 text-muted hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {col.links.map((l, li) => (
                <div key={li} className="flex gap-2">
                  <Input
                    placeholder="Label"
                    value={l.label}
                    onChange={(e) => setLink(i, li, { label: e.target.value })}
                  />
                  <Input
                    placeholder="/link"
                    value={l.href}
                    onChange={(e) => setLink(i, li, { href: e.target.value })}
                  />
                  <button
                    type="button"
                    aria-label="Remove link"
                    onClick={() => setCol(i, { links: col.links.filter((_, lx) => lx !== li) })}
                    className="shrink-0 rounded-md border border-line px-2 text-muted hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setCol(i, { links: [...col.links, { label: "", href: "" }] })}
                className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
              >
                <Plus className="h-3 w-3" /> Add link
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setColumns((p) => [...p, { title: "", links: [] }])}
        className="mt-4 inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-sm hover:bg-surface"
      >
        <Plus className="h-4 w-4" /> Add column
      </button>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="showNewsletter"
          defaultChecked={initialNewsletter}
          className="h-4 w-4 accent-[var(--brand)]"
        />
        Show newsletter signup in footer
      </label>

      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save footer"}
        </Button>
        {state?.ok && <span className="text-sm text-brand">Saved.</span>}
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
