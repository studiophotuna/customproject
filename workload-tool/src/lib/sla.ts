import { computeDueAt } from "@/lib/allocation/allocation-engine";

// SLA clock.
// -----------------------------------------------------------------------------
// The engine owns computeDueAt and takes the business-hours calendar as an
// injected function. This module supplies that function and is the only place
// that knows what "business hours" means here.
//
// WHAT IS IMPLEMENTED: a working-day window (BUSINESS_DAYS + BUSINESS_DAY_START
// /END), walked minute-budget-wise across days.
// WHAT IS NOT: public holidays, per-team calendars, and shift exceptions. Those
// belong behind `HolidayCalendar` below and are the reason this stays a hook —
// swap in the real calendar source and nothing else changes.

export interface BusinessHours {
  /** Day numbers as JS getDay(): 0 = Sunday .. 6 = Saturday. */
  days: number[];
  startMinutes: number; // minutes past local midnight
  endMinutes: number;
}

export interface HolidayCalendar {
  isHoliday(date: Date): boolean;
}

/** Placeholder calendar: no holidays. Replace with the real source. */
export const NO_HOLIDAYS: HolidayCalendar = { isHoliday: () => false };

function parseHhMm(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return fallback;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function businessHoursFromEnv(): BusinessHours {
  const days = (process.env.BUSINESS_DAYS ?? "1,2,3,4,5")
    .split(",")
    .map((d) => Number(d.trim()))
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);

  const startMinutes = parseHhMm(process.env.BUSINESS_DAY_START, 9 * 60);
  const endMinutes = parseHhMm(process.env.BUSINESS_DAY_END, 17 * 60);

  if (endMinutes <= startMinutes) {
    throw new Error(
      "BUSINESS_DAY_END must be after BUSINESS_DAY_START (overnight windows are not supported)."
    );
  }
  if (days.length === 0) {
    throw new Error("BUSINESS_DAYS resolved to no working days.");
  }
  return { days, startMinutes, endMinutes };
}

function minutesIntoDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;
}

function atMinutes(date: Date, minutes: number): Date {
  const out = new Date(date);
  out.setHours(0, 0, 0, 0);
  out.setMinutes(minutes);
  return out;
}

function isWorkingDay(
  date: Date,
  hours: BusinessHours,
  calendar: HolidayCalendar
): boolean {
  return hours.days.includes(date.getDay()) && !calendar.isHoliday(date);
}

/**
 * Add `minutes` of business time to `from`, skipping non-working days and the
 * hours outside the window. Guarded against runaway loops: a budget that cannot
 * be spent inside a year of working days is a configuration error, not a wait.
 */
export function makeAddBusinessMinutes(
  hours: BusinessHours = businessHoursFromEnv(),
  calendar: HolidayCalendar = NO_HOLIDAYS
): (from: Date, minutes: number) => Date {
  return (from, minutes) => {
    let remaining = minutes;
    let cursor = new Date(from);
    let guard = 0;

    while (remaining > 0) {
      if (guard++ > 366) {
        throw new Error(
          `SLA budget of ${minutes} business minutes exceeds a year of working days.`
        );
      }

      if (!isWorkingDay(cursor, hours, calendar)) {
        cursor = atMinutes(nextDay(cursor), hours.startMinutes);
        continue;
      }

      const position = minutesIntoDay(cursor);
      if (position < hours.startMinutes) {
        cursor = atMinutes(cursor, hours.startMinutes);
        continue;
      }
      if (position >= hours.endMinutes) {
        cursor = atMinutes(nextDay(cursor), hours.startMinutes);
        continue;
      }

      const availableToday = hours.endMinutes - position;
      if (remaining <= availableToday) {
        return new Date(cursor.getTime() + remaining * 60_000);
      }
      remaining -= availableToday;
      cursor = atMinutes(nextDay(cursor), hours.startMinutes);
    }

    return cursor;

    function nextDay(date: Date): Date {
      const out = new Date(date);
      out.setDate(out.getDate() + 1);
      return out;
    }
  };
}

export interface SlaInput {
  receivedAt: Date;
  slaMinutes: number;
  businessHoursOnly: boolean;
}

/** Stamp a ticket's dueAt at creation. Delegates the maths to the engine. */
export function dueAtFor({
  receivedAt,
  slaMinutes,
  businessHoursOnly,
}: SlaInput): Date {
  return computeDueAt(
    receivedAt,
    slaMinutes,
    businessHoursOnly,
    makeAddBusinessMinutes()
  );
}

/**
 * Stop-the-clock resume: push dueAt out by the time spent ON_HOLD.
 * Calendar minutes are added directly; business-hours tickets walk the calendar
 * so a hold spanning a weekend does not silently consume the budget.
 */
export function dueAtAfterHold(
  currentDueAt: Date,
  heldMinutes: number,
  businessHoursOnly: boolean
): Date {
  if (heldMinutes <= 0) return currentDueAt;
  return businessHoursOnly
    ? makeAddBusinessMinutes()(currentDueAt, heldMinutes)
    : new Date(currentDueAt.getTime() + heldMinutes * 60_000);
}
