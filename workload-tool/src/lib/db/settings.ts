import { prisma } from "@/lib/db/prisma";
import { SETTING_DEFINITIONS, SETTING_KEYS } from "@/lib/domain/work";

// Admin-editable settings, with code-level fallbacks so the app works before an
// admin has saved anything and keeps working if a row is deleted.

export type Settings = Record<string, string>;

export async function readSettings(): Promise<Settings> {
  const rows = await prisma.appSetting.findMany();
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const out: Settings = {};
  for (const def of SETTING_DEFINITIONS) {
    out[def.key] = stored[def.key] ?? def.fallback;
  }
  return out;
}

function num(settings: Settings, key: string, fallback: number): number {
  const parsed = Number(settings[key]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function dailyTargetHours(settings: Settings): number {
  return num(settings, SETTING_KEYS.dailyTargetHours, 6.8);
}

export function utilizationTarget(settings: Settings): number {
  return num(settings, SETTING_KEYS.utilizationTargetPct, 85);
}

export function timelinessTarget(settings: Settings): number {
  return num(settings, SETTING_KEYS.timelinessTargetPct, 95);
}

export async function writeSetting(
  key: string,
  value: string,
  actor: string
): Promise<void> {
  const def = SETTING_DEFINITIONS.find((d) => d.key === key);
  if (!def) throw new Error(`Unknown setting "${key}".`);

  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${def.label} cannot be empty.`);
  if (!Number.isFinite(Number(trimmed)) || Number(trimmed) <= 0) {
    throw new Error(`${def.label} must be a positive number.`);
  }

  await prisma.appSetting.upsert({
    where: { key },
    update: { value: trimmed, updatedBy: actor, label: def.label, description: def.description },
    create: {
      key,
      value: trimmed,
      label: def.label,
      description: def.description,
      updatedBy: actor,
    },
  });
}
