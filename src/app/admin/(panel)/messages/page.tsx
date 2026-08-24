import { createClient } from "@/lib/supabase/server";
import { AdminHeader, Panel, Badge } from "@/components/admin/ui";
import { ReadToggle } from "@/components/admin/ReadToggle";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteMessage } from "./actions";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <>
      <AdminHeader title="Messages" description="Enquiries from the contact form." />
      <div className="grid gap-4">
        {(data ?? []).map((m) => (
          <Panel key={m.id} className={cn("p-5", !m.is_read && "border-brand")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">
                  {m.name}
                  {m.subject ? <span className="text-muted"> · {m.subject}</span> : null}
                  {!m.is_read && (
                    <span className="ml-2 align-middle">
                      <Badge tone="brand">new</Badge>
                    </span>
                  )}
                </p>
                <p className="text-sm text-muted">
                  {m.email}
                  {m.phone ? ` · ${m.phone}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted">{formatDate(m.created_at)}</p>
              </div>
              <div className="flex items-center gap-3">
                <ReadToggle id={m.id} isRead={m.is_read} />
                <DeleteButton action={deleteMessage.bind(null, m.id)} compact />
              </div>
            </div>
            <p className="mt-3 rounded-md bg-surface p-3 text-sm text-foreground">{m.message}</p>
          </Panel>
        ))}
        {(!data || data.length === 0) && <p className="text-muted">No messages yet.</p>}
      </div>
    </>
  );
}
