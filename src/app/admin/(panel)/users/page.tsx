import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { Constants } from "@/lib/database.types";
import { updateRole } from "./actions";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Users & Roles" };

export default async function UsersPage() {
  const me = await requireAdmin();
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at");

  return (
    <>
      <AdminHeader
        title="Users & Roles"
        description="Owner and admin can assign roles. Staff can manage the store; customers cannot access the admin."
      />
      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-line bg-surface text-left text-xs uppercase text-muted">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Joined</th>
              <th className="p-3">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(users ?? []).map((u) => (
              <tr key={u.id}>
                <td className="p-3">
                  <div className="font-medium text-foreground">{u.full_name ?? "—"}</div>
                  <div className="text-muted">{u.email}</div>
                </td>
                <td className="p-3 text-muted">{formatDate(u.created_at)}</td>
                <td className="p-3">
                  {u.id === me.id ? (
                    <span className="capitalize text-muted">{u.role} (you)</span>
                  ) : (
                    <StatusSelect
                      value={u.role}
                      options={Constants.public.Enums.user_role}
                      action={updateRole.bind(null, u.id)}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
