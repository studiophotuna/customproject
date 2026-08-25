"use client";

import { useActionState, useTransition } from "react";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import {
  addManualInstagramImage,
  removeManualInstagramImage,
  type ActionState,
} from "@/app/admin/(panel)/settings/actions";
import type { InstagramFeedItem } from "@/lib/types";

export function ManualInstagramGallery({ items }: { items: InstagramFeedItem[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    addManualInstagramImage,
    null,
  );
  const [busy, start] = useTransition();

  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        Upload the photos to feature in the homepage feed. Up to 8 show at a time.
      </p>

      {items.length > 0 && (
        <div className="mb-5 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {items.map((it) => (
            <div key={it.id} className="group relative aspect-square overflow-hidden rounded-md border border-line">
              <Image src={it.mediaUrl} alt={it.caption || "Feed image"} fill sizes="120px" className="object-cover" />
              <button
                type="button"
                aria-label="Remove"
                disabled={busy}
                onClick={() => start(() => removeManualInstagramImage(it.id))}
                className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-red-600 opacity-0 transition group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form action={action} className="grid gap-3 rounded-md border border-line p-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="ig-image">Add image *</Label>
          <Input id="ig-image" name="image" type="file" accept="image/*" required />
        </div>
        <div>
          <Label htmlFor="ig-link">Link (optional)</Label>
          <Input id="ig-link" name="permalink" placeholder="https://instagram.com/p/…" />
        </div>
        <div>
          <Label htmlFor="ig-caption">Caption (optional)</Label>
          <Input id="ig-caption" name="caption" placeholder="Ube cake" />
        </div>
        <div className="sm:col-span-2 flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Uploading…" : "Add image"}
          </Button>
          {state?.ok && <span className="text-sm text-brand">{state.message}</span>}
          {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
        </div>
      </form>
    </div>
  );
}
