"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { writeSetting } from "@/lib/db/settings";
import { ROLES, isRole } from "@/lib/domain/constants";
import { SETTING_DEFINITIONS } from "@/lib/domain/work";

export interface AdminState {
  error?: string;
  ok?: string;
}

/** Save the admin-editable targets (daily hours, utilization, timeliness…). */
export async function saveSettingsAction(
  _previous: AdminState,
  formData: FormData
): Promise<AdminState> {
  const identity = await requireRole("ADMIN");

  try {
    for (const def of SETTING_DEFINITIONS) {
      const value = formData.get(def.key);
      if (typeof value === "string") await writeSetting(def.key, value, identity.upn);
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save." };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/team");
  revalidatePath("/my-work");
  revalidatePath("/");
  return { ok: "Targets saved." };
}

/** Create or update an agent. Upserts on the AD upn, which is the identity key. */
export async function saveAgentAction(
  _previous: AdminState,
  formData: FormData
): Promise<AdminState> {
  const identity = await requireRole("ADMIN");

  const adUpn = String(formData.get("adUpn") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const cap = Number(formData.get("concurrentCap"));
  const active = formData.get("active") === "on";

  if (!adUpn.includes("@")) return { error: "A userPrincipalName like name@domain is required." };
  if (!displayName) return { error: "Display name is required." };
  if (!isRole(role)) return { error: `Role must be one of ${ROLES.join(", ")}.` };
  if (!Number.isInteger(cap) || cap < 1 || cap > 50) {
    return { error: "Concurrent cap must be a whole number between 1 and 50." };
  }

  await prisma.agent.upsert({
    where: { adUpn },
    update: { displayName, role, concurrentCap: cap, active },
    create: { adUpn, displayName, role, concurrentCap: cap, active },
  });

  await prisma.auditLog.create({
    data: {
      ticketId: null,
      actor: identity.upn,
      event: "OVERRIDE",
      detailsJson: JSON.stringify({ adminAction: "saveAgent", adUpn, role, cap, active }),
    },
  });

  revalidatePath("/admin/agents");
  revalidatePath("/team");
  return { ok: `${displayName} saved.` };
}

/** Add a shift window so the allocator can see the agent as on shift. */
export async function addShiftAction(
  _previous: AdminState,
  formData: FormData
): Promise<AdminState> {
  await requireRole("ADMIN");

  const agentId = String(formData.get("agentId") ?? "");
  const startsAt = new Date(String(formData.get("startsAt") ?? ""));
  const endsAt = new Date(String(formData.get("endsAt") ?? ""));

  if (!agentId) return { error: "Pick an agent." };
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { error: "Both start and end must be valid date/times." };
  }
  if (endsAt <= startsAt) return { error: "The shift must end after it starts." };

  await prisma.shift.create({ data: { agentId, startsAt, endsAt } });

  revalidatePath("/admin/agents");
  revalidatePath("/allocation");
  return { ok: "Shift added." };
}

/** Create or update an SLA rule. Editing never moves the clock on live tickets. */
export async function saveSlaAction(
  _previous: AdminState,
  formData: FormData
): Promise<AdminState> {
  await requireRole("ADMIN");

  const ticketType = String(formData.get("ticketType") ?? "").trim();
  const slaMinutes = Number(formData.get("slaMinutes"));
  const businessHoursOnly = formData.get("businessHoursOnly") === "on";
  const active = formData.get("active") === "on";

  if (!ticketType) return { error: "Ticket type is required." };
  if (!Number.isInteger(slaMinutes) || slaMinutes < 1) {
    return { error: "SLA minutes must be a positive whole number." };
  }

  await prisma.slaRule.upsert({
    where: { ticketType },
    update: { slaMinutes, businessHoursOnly, active },
    create: { ticketType, slaMinutes, businessHoursOnly, active },
  });

  revalidatePath("/sla");
  return {
    ok: `${ticketType} saved. Tickets already in flight keep the SLA snapshotted at their creation.`,
  };
}
