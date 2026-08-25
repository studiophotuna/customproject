import { AdminHeader, Panel } from "@/components/admin/ui";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { ProfileForm } from "@/components/auth/ProfileForm";
import { requireStaff } from "@/lib/auth";

export const metadata = { title: "My Account" };

export default async function AdminAccountPage() {
  const profile = await requireStaff();

  return (
    <>
      <AdminHeader
        title="My Account"
        description={`Signed in as ${profile.email} · ${profile.role}`}
      />
      <div className="grid max-w-3xl gap-6 md:grid-cols-2">
        <Panel className="p-6">
          <h2 className="mb-4 font-semibold text-foreground">Profile</h2>
          <ProfileForm
            fullName={profile.full_name ?? ""}
            phone={profile.phone ?? ""}
            email={profile.email ?? ""}
          />
        </Panel>
        <Panel className="p-6">
          <h2 className="mb-4 font-semibold text-foreground">Change Password</h2>
          <ChangePasswordForm />
        </Panel>
      </div>
    </>
  );
}
