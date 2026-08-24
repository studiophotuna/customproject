import { createClient } from "@/lib/supabase/server";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { CopyEmails } from "@/components/admin/CopyEmails";
import { deleteSubscriber } from "./actions";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Subscribers" };

export default async function SubscribersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("newsletter_subscribers")
    .select("*")
    .order("created_at", { ascending: false });

  const emails = (data ?? []).map((s) => s.email);

  return (
    <>
      <AdminHeader
        title="Newsletter Subscribers"
        description={`${emails.length} subscriber${emails.length === 1 ? "" : "s"}.`}
        action={<CopyEmails emails={emails} />}
      />
      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead className="border-b border-line bg-surface text-left text-xs uppercase text-muted">
            <tr>
              <th className="p-3">Email</th>
              <th className="p-3">Subscribed</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(data ?? []).map((s) => (
              <tr key={s.id}>
                <td className="p-3 text-foreground">{s.email}</td>
                <td className="p-3 text-muted">{formatDate(s.created_at)}</td>
                <td className="p-3 text-right">
                  <DeleteButton action={deleteSubscriber.bind(null, s.id)} compact />
                </td>
              </tr>
            ))}
            {emails.length === 0 && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-muted">
                  No subscribers yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
