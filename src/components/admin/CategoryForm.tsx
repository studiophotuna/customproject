"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Field";
import type { ActionState } from "@/app/admin/(panel)/categories/actions";
import type { Tables } from "@/lib/database.types";

export function CategoryForm({
  action,
  category,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  category?: Tables<"categories">;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);
  const isEdit = Boolean(category);

  return (
    <form action={formAction} className="grid max-w-xl gap-5">
      <div>
        <Label htmlFor="name">Name *</Label>
        <Input id="name" name="name" required defaultValue={category?.name} />
      </div>
      <div>
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" defaultValue={category?.slug} placeholder="auto from name" />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={category?.description ?? ""} />
      </div>
      <div>
        <Label htmlFor="sort_order">Sort order</Label>
        <Input id="sort_order" name="sort_order" type="number" defaultValue={category?.sort_order ?? 0} />
      </div>
      <div>
        <Label htmlFor="image">Image {isEdit && "(leave empty to keep current)"}</Label>
        {category?.image_url && (
          <div className="mb-2 relative h-24 w-24 overflow-hidden rounded-md border border-line">
            <Image src={category.image_url} alt="" fill sizes="96px" className="object-cover" />
          </div>
        )}
        <Input id="image" name="image" type="file" accept="image/*" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_active" defaultChecked={category?.is_active ?? true} className="h-4 w-4 accent-[var(--brand)]" />
        Active
      </label>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create category"}
        </Button>
        <Link href="/admin/categories" className="inline-flex items-center rounded-card border border-line px-5 py-2.5 text-sm">
          Cancel
        </Link>
      </div>
    </form>
  );
}
