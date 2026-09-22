// Work tracking vocabulary and the rules that turn recorded time into numbers.
// -----------------------------------------------------------------------------
// Utilization and timeliness are measured from what actually happened, so the
// definitions live in one place rather than being re-derived per screen.

export const ACTIVITY_KINDS = [
  "TICKET",
  "MEETING",
  "ADHOC",
  "TRAINING",
  "BREAK",
  "IDLE",
] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

/**
 * Time that counts towards the daily utilization target.
 *
 * BREAK and IDLE are recorded but excluded: break is not work, and idle is
 * clocked-in time with nothing being done — counting it would let utilization
 * rise by simply staying logged in. TRAINING counts, being directed work.
 */
export const PRODUCTIVE_KINDS: readonly ActivityKind[] = [
  "TICKET",
  "MEETING",
  "ADHOC",
  "TRAINING",
];

/** Activity kinds a member can select for themselves, in display order. */
export const SELECTABLE_KINDS: readonly ActivityKind[] = [
  "MEETING",
  "ADHOC",
  "TRAINING",
  "BREAK",
  "IDLE",
];

export const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  TICKET: "On a ticket",
  MEETING: "Meeting",
  ADHOC: "Ad-hoc work",
  TRAINING: "Training",
  BREAK: "Break",
  IDLE: "Idle",
};

export function isProductive(kind: string): boolean {
  return (PRODUCTIVE_KINDS as readonly string[]).includes(kind);
}

export function isActivityKind(value: string): value is ActivityKind {
  return (ACTIVITY_KINDS as readonly string[]).includes(value);
}

// --- Settings ----------------------------------------------------------------
// Admin-editable, stored in AppSetting. These are the fallbacks used before an
// admin has saved anything, and the definitions the settings screen renders.

export const SETTING_KEYS = {
  dailyTargetHours: "daily_target_hours",
  timelinessTargetPct: "timeliness_target_pct",
  utilizationTargetPct: "utilization_target_pct",
  breakAllowanceMinutes: "break_allowance_minutes",
} as const;

export interface SettingDefinition {
  key: string;
  label: string;
  description: string;
  fallback: string;
  unit: string;
}

export const SETTING_DEFINITIONS: SettingDefinition[] = [
  {
    key: SETTING_KEYS.dailyTargetHours,
    label: "Daily productive hours per FTE",
    description:
      "The denominator for utilization. 6.8 of an 8-hour day, allowing for breaks and overheads.",
    fallback: "6.8",
    unit: "hours",
  },
  {
    key: SETTING_KEYS.utilizationTargetPct,
    label: "Utilization target",
    description: "Productive time as a percentage of the daily target.",
    fallback: "85",
    unit: "%",
  },
  {
    key: SETTING_KEYS.timelinessTargetPct,
    label: "Timeliness target",
    description: "Share of resolved tickets that must beat their SLA due time.",
    fallback: "95",
    unit: "%",
  },
  {
    key: SETTING_KEYS.breakAllowanceMinutes,
    label: "Break allowance",
    description: "Break minutes per shift. Recorded for reporting; not productive time.",
    fallback: "60",
    unit: "minutes",
  },
];

// --- Derived measures --------------------------------------------------------

export interface UtilizationInput {
  productiveSeconds: number;
  dailyTargetHours: number;
}

/** Productive time as a percentage of the daily target. Capped for display sanity. */
export function utilizationPct({
  productiveSeconds,
  dailyTargetHours,
}: UtilizationInput): number {
  const target = dailyTargetHours * 3600;
  if (target <= 0) return 0;
  return Math.round((productiveSeconds / target) * 1000) / 10;
}

/** A ticket is on time when it was resolved at or before its (hold-adjusted) due time. */
export function isOnTime(resolvedAt: Date | null, dueAt: Date): boolean {
  return resolvedAt !== null && resolvedAt.getTime() <= dueAt.getTime();
}

export function timelinessPct(onTime: number, resolved: number): number {
  if (resolved <= 0) return 0;
  return Math.round((onTime / resolved) * 1000) / 10;
}

/** "1h 04m" / "12m 30s" — compact, stable width for dense tables. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s % 60).padStart(2, "0")}s`;
}
