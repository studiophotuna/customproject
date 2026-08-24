import { AdminHeader } from "@/components/admin/ui";
import { TestimonialForm } from "@/components/admin/TestimonialForm";
import { createTestimonial } from "../actions";

export const metadata = { title: "New testimonial" };

export default function NewTestimonialPage() {
  return (
    <>
      <AdminHeader title="New testimonial" />
      <TestimonialForm action={createTestimonial} />
    </>
  );
}
