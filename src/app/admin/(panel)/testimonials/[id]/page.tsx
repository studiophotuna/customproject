import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/ui";
import { TestimonialForm } from "@/components/admin/TestimonialForm";
import { updateTestimonial } from "../actions";

export const metadata = { title: "Edit testimonial" };

export default async function EditTestimonialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: testimonial } = await supabase
    .from("testimonials")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!testimonial) notFound();

  return (
    <>
      <AdminHeader title="Edit testimonial" />
      <TestimonialForm action={updateTestimonial.bind(null, id)} testimonial={testimonial} />
    </>
  );
}
