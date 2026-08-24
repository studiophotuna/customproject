import { AdminHeader } from "@/components/admin/ui";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { createCategory } from "../actions";

export const metadata = { title: "New category" };

export default function NewCategoryPage() {
  return (
    <>
      <AdminHeader title="New category" />
      <CategoryForm action={createCategory} />
    </>
  );
}
