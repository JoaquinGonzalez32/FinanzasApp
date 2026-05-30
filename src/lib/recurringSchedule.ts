import type { RecurringFrequency, RecurringTemplate } from "../types/database";

/**
 * Pure occurrence math for recurring templates. No I/O — trivially testable.
 *
 * A template "fires" on a set of calendar dates determined by its frequency:
 *   monthly  → day_of_month each month
 *   weekly   → day_of_week each week
 *   biweekly → day_of_week every 14 days, aligned to anchor_date
 *   yearly   → month_of_year + day_of_month once a year
 *
 * All dates are returned as local YYYY-MM-DD strings.
 */

const DAY_MS = 86_400_000;

function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/** Strip time → local midnight. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Parse a YYYY-MM-DD string as a LOCAL date (avoids UTC offset drift). */
function parseLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Whole local days from a → b (b - a). */
function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
}

/**
 * Every date (YYYY-MM-DD) on which `t` fires within [start, end] inclusive.
 * Returns [] if the template lacks the fields its frequency requires.
 */
export function getOccurrencesInRange(
  t: RecurringTemplate,
  start: Date,
  end: Date
): string[] {
  const out: string[] = [];
  const s = startOfDay(start);
  const e = startOfDay(end);
  if (e < s) return out;

  switch (t.frequency) {
    case "monthly": {
      if (t.day_of_month == null) break;
      let cur = new Date(s.getFullYear(), s.getMonth(), 1);
      while (cur <= e) {
        const occ = new Date(cur.getFullYear(), cur.getMonth(), t.day_of_month);
        if (occ >= s && occ <= e) out.push(fmt(occ));
        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
      }
      break;
    }
    case "yearly": {
      if (t.day_of_month == null || t.month_of_year == null) break;
      for (let y = s.getFullYear(); y <= e.getFullYear(); y++) {
        const occ = new Date(y, t.month_of_year - 1, t.day_of_month);
        if (occ >= s && occ <= e) out.push(fmt(occ));
      }
      break;
    }
    case "weekly": {
      if (t.day_of_week == null) break;
      const first = new Date(s);
      const delta = (t.day_of_week - first.getDay() + 7) % 7;
      first.setDate(first.getDate() + delta);
      for (const d = first; d <= e; d.setDate(d.getDate() + 7)) out.push(fmt(d));
      break;
    }
    case "biweekly": {
      if (t.day_of_week == null || !t.anchor_date) break;
      const anchor = parseLocal(t.anchor_date);
      // Smallest k >= 0 such that (anchor + offset + k) lands on/after s,
      // staying on the 14-day cycle anchored at `anchor`.
      const offset = ((daysBetween(anchor, s) % 14) + 14) % 14;
      const k = (14 - offset) % 14;
      const cur = new Date(s);
      cur.setDate(cur.getDate() + k);
      for (; cur <= e; cur.setDate(cur.getDate() + 14)) out.push(fmt(cur));
      break;
    }
  }
  return out;
}

/**
 * Next occurrence on/after `from`, or null if none within ~13 months
 * (the lookahead window comfortably covers yearly templates).
 */
export function getNextOccurrence(
  t: RecurringTemplate,
  from: Date = new Date()
): string | null {
  const start = startOfDay(from);
  const end = new Date(start.getFullYear() + 1, start.getMonth() + 1, start.getDate());
  const occ = getOccurrencesInRange(t, start, end);
  return occ.length ? occ[0] : null;
}

const WEEKDAYS_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Short human label for a template's schedule, e.g. "Día 5" / "Cada lunes". */
export function describeSchedule(t: RecurringTemplate): string {
  switch (t.frequency) {
    case "monthly":
      return `Día ${t.day_of_month}`;
    case "weekly":
      return t.day_of_week != null ? `Cada ${WEEKDAYS_ES[t.day_of_week]}` : "Semanal";
    case "biweekly":
      return t.day_of_week != null
        ? `Cada 2 semanas, ${WEEKDAYS_ES[t.day_of_week]}`
        : "Cada 2 semanas";
    case "yearly":
      return t.day_of_month != null && t.month_of_year != null
        ? `${t.day_of_month} de ${MONTHS_ES[t.month_of_year - 1]}`
        : "Anual";
    default:
      return "";
  }
}

/**
 * Monthly-equivalent amount, so totals across mixed frequencies are comparable.
 * weekly ≈ 52/12 per month, biweekly ≈ 26/12, yearly ≈ 1/12.
 */
export function monthlyEquivalent(t: RecurringTemplate): number {
  switch (t.frequency) {
    case "weekly":
      return (t.amount * 52) / 12;
    case "biweekly":
      return (t.amount * 26) / 12;
    case "yearly":
      return t.amount / 12;
    case "monthly":
    default:
      return t.amount;
  }
}

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  monthly: "Mensual",
  weekly: "Semanal",
  biweekly: "Quincenal",
  yearly: "Anual",
};
