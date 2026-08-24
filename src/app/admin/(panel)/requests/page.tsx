import { createClient } from "@/lib/supabase/server";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { Constants } from "@/lib/database.types";
import { updateRequestStatus, deleteRequest } from "./actions";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Cake Requests" };

export default async function RequestsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("custom_cake_requests")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <>
      <AdminHeader title="Custom Cake Requests" description="Enquiries from the custom cake form." />
      <div className="grid gap-4">
        {(data ?? []).map((r) => (
          <Panel key={r.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">
                  {r.name}
                  {r.occasion ? <span className="text-muted"> · {r.occasion}</span> : null}
                </p>
                <p className="text-sm text-muted">
                  {r.email}
                  {r.phone ? ` · ${r.phone}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {formatDate(r.created_at)}
                  {r.event_date ? ` · event ${formatDate(r.event_date)}` : ""}
                  {r.servings ? ` · ${r.servings} servings` : ""}
                  {r.budget ? ` · budget ${r.budget}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusSelect
                  value={r.status}
                  options={Constants.public.Enums.request_status}
                  action={updateRequestStatus.bind(null, r.id)}
                />
                <DeleteButton action={deleteRequest.bind(null, r.id)} compact />
              </div>
            </div>
            {r.details && (
              <p className="mt-3 rounded-md bg-surface p-3 text-sm text-foreground">{r.details}</p>
            )}
          </Panel>
        ))}
        {(!data || data.length === 0) && <p className="text-muted">No requests yet.</p>}
      </div>
    </>
  );
}
