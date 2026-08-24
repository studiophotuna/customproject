"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import type { ActionState } from "@/app/admin/(panel)/testimonials/actions";
import type { Tables } from "@/lib/database.types";

export function TestimonialForm({
  action,
  testimonial,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  testimonial?: Tables<"testimonials">;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);
  const isEdit = Boolean(testimonial);

  return (
    <form action={formAction} className="grid max-w-xl gap-5">
      <div>
        <Label htmlFor="author">Author *</Label>
        <Input id="author" name="author" required defaultValue={testimonial?.author} />
      </div>
      <div>
        <Label htmlFor="rating">Rating</Label>
        <Select id="rating" name="rating" defaultValue={String(testimonial?.rating ?? 5)}>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} star{n > 1 ? "s" : ""}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="content">Content *</Label>
        <Textarea id="content" name="content" required defaultValue={testimonial?.content} />
      </div>
      <div>
        <Label htmlFor="sort_order">Sort order</Label>
        <Input id="sort_order" name="sort_order" type="number" defaultValue={testimonial?.sort_order ?? 0} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_active" defaultChecked={testimonial?.is_active ?? true} className="h-4 w-4 accent-[var(--brand)]" />
        Active
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create testimonial"}
        </Button>
        <Link href="/admin/testimonials" className="inline-flex items-center rounded-card border border-line px-5 py-2.5 text-sm">
          Cancel
        </Link>
      </div>
    </form>
  );
}
