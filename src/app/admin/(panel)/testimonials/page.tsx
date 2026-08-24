import Link from "next/link";
import { Plus, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader, Panel, Badge } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteTestimonial } from "./actions";

export const metadata = { title: "Testimonials" };

export default async function TestimonialsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("testimonials").select("*").order("sort_order");

  return (
    <>
      <AdminHeader
        title="Testimonials"
        description="Customer reviews shown on the homepage."
        action={
          <Link
            href="/admin/testimonials/new"
            className="inline-flex items-center gap-2 rounded-card bg-brand px-4 py-2 text-sm text-on-brand hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" /> New testimonial
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {(data ?? []).map((t) => (
          <Panel key={t.id} className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex gap-0.5 text-brand">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              {t.is_active ? <Badge tone="green">active</Badge> : <Badge tone="muted">hidden</Badge>}
            </div>
            <p className="text-sm text-foreground">{t.content}</p>
            <p className="mt-2 text-xs text-muted">— {t.author}</p>
            <div className="mt-4 flex items-center gap-3">
              <Link href={`/admin/testimonials/${t.id}`} className="text-sm text-brand hover:underline">
                Edit
              </Link>
              <DeleteButton action={deleteTestimonial.bind(null, t.id)} compact />
            </div>
          </Panel>
        ))}
        {(!data || data.length === 0) && <p className="text-muted">No testimonials yet.</p>}
      </div>
    </>
  );
}
