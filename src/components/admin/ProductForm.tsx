"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select, Textarea } from "@/components/ui/Field";
import type { ActionState } from "@/app/admin/(panel)/products/actions";
import type { Tables } from "@/lib/database.types";

type Category = Pick<Tables<"categories">, "id" | "name">;
type Product = Tables<"products">;

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-[var(--brand)]" />
      {label}
    </label>
  );
}

export function ProductForm({
  action,
  categories,
  product,
}: {
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  categories: Category[];
  product?: Product;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);
  const isEdit = Boolean(product);

  return (
    <form action={formAction} className="grid max-w-2xl gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Name *</Label>
          <Input id="name" name="name" required defaultValue={product?.name} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" defaultValue={product?.slug} placeholder="auto from name" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" name="description" defaultValue={product?.description ?? ""} />
        </div>
        <div>
          <Label htmlFor="price">Price *</Label>
          <Input id="price" name="price" type="number" step="0.01" min="0" required defaultValue={product?.price} />
        </div>
        <div>
          <Label htmlFor="currency">Currency</Label>
          <Input id="currency" name="currency" defaultValue={product?.currency ?? "AED"} />
        </div>
        <div>
          <Label htmlFor="category_id">Category</Label>
          <Select id="category_id" name="category_id" defaultValue={product?.category_id ?? ""}>
            <option value="">— none —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="sort_order">Sort order</Label>
          <Input id="sort_order" name="sort_order" type="number" defaultValue={product?.sort_order ?? 0} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="image">Image {isEdit && "(leave empty to keep current)"}</Label>
          {product?.image_url && (
            <div className="mb-2 relative h-24 w-24 overflow-hidden rounded-md border border-line">
              <Image src={product.image_url} alt="" fill sizes="96px" className="object-cover" />
            </div>
          )}
          <Input id="image" name="image" type="file" accept="image/*" />
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <Check name="is_active" label="Active" defaultChecked={product?.is_active ?? true} />
        <Check name="featured" label="Featured" defaultChecked={product?.featured ?? false} />
        <Check name="in_stock" label="In stock" defaultChecked={product?.in_stock ?? true} />
        <Check name="is_new" label="New badge" defaultChecked={product?.is_new ?? false} />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create product"}
        </Button>
        <Link
          href="/admin/products"
          className="inline-flex items-center rounded-card border border-line px-5 py-2.5 text-sm"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
