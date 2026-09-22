import { requireRole } from "@/lib/auth";
import { listSlaRules } from "@/lib/db/tickets";
import { Card } from "@/components/ui";
import { NewTicketForm } from "@/app/tickets/new/NewTicketForm";

export const dynamic = "force-dynamic";

export default async function NewTicketPage() {
  await requireRole("MEMBER");
  const rules = await listSlaRules();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-lg font-semibold">New ticket</h1>
        <p className="text-xs text-[var(--color-ink-muted)]">
          Created as NEW and left unassigned — the allocation worker picks it up
          on its next pass.
        </p>
      </div>

      <Card>
        <NewTicketForm
          rules={rules.map((rule) => ({
            ticketType: rule.ticketType,
            slaMinutes: rule.slaMinutes,
            businessHoursOnly: rule.businessHoursOnly,
          }))}
        />
      </Card>
    </div>
  );
}
