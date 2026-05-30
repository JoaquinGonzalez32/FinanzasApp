import { test } from "node:test";
import assert from "node:assert/strict";
import type { RecurringTemplate } from "../types/database";
import {
  getOccurrencesInRange,
  getNextOccurrence,
  describeSchedule,
  monthlyEquivalent,
} from "./recurringSchedule.ts";

/** Build a template with sensible defaults; override per case. */
function tpl(overrides: Partial<RecurringTemplate>): RecurringTemplate {
  return {
    id: "t1",
    user_id: "u1",
    category_id: "c1",
    account_id: null,
    amount: 100,
    frequency: "monthly",
    day_of_month: null,
    day_of_week: null,
    month_of_year: null,
    anchor_date: null,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const d = (iso: string) => {
  const [y, m, day] = iso.split("-").map(Number);
  return new Date(y, m - 1, day);
};

// ── monthly ──────────────────────────────────────────────────────────────────
test("monthly: one occurrence per month within range", () => {
  const t = tpl({ frequency: "monthly", day_of_month: 15 });
  assert.deepEqual(
    getOccurrencesInRange(t, d("2026-01-01"), d("2026-03-31")),
    ["2026-01-15", "2026-02-15", "2026-03-15"]
  );
});

test("monthly: inclusive bounds — occurrence exactly on start/end counts", () => {
  const t = tpl({ frequency: "monthly", day_of_month: 10 });
  assert.deepEqual(
    getOccurrencesInRange(t, d("2026-01-10"), d("2026-02-10")),
    ["2026-01-10", "2026-02-10"]
  );
});

test("monthly: day_of_month 28 works at February boundary", () => {
  const t = tpl({ frequency: "monthly", day_of_month: 28 });
  assert.deepEqual(
    getOccurrencesInRange(t, d("2026-02-01"), d("2026-02-28")),
    ["2026-02-28"]
  );
});

test("monthly: missing day_of_month yields no occurrences", () => {
  const t = tpl({ frequency: "monthly", day_of_month: null });
  assert.deepEqual(getOccurrencesInRange(t, d("2026-01-01"), d("2026-12-31")), []);
});

// ── weekly ───────────────────────────────────────────────────────────────────
test("weekly: every Monday of January 2026", () => {
  const t = tpl({ frequency: "weekly", day_of_week: 1 }); // Mon
  // Jan 1 2026 is Thursday → first Monday is the 5th
  assert.deepEqual(
    getOccurrencesInRange(t, d("2026-01-01"), d("2026-01-31")),
    ["2026-01-05", "2026-01-12", "2026-01-19", "2026-01-26"]
  );
});

test("weekly: 7-day spacing, all on the chosen weekday", () => {
  const t = tpl({ frequency: "weekly", day_of_week: 4 }); // Thu
  const occ = getOccurrencesInRange(t, d("2026-01-01"), d("2026-01-31"));
  for (const iso of occ) assert.equal(d(iso).getDay(), 4);
});

// ── biweekly ─────────────────────────────────────────────────────────────────
test("biweekly: 14-day cadence anchored to anchor_date", () => {
  const t = tpl({ frequency: "biweekly", day_of_week: 3, anchor_date: "2026-01-07" }); // Wed
  assert.deepEqual(
    getOccurrencesInRange(t, d("2026-01-01"), d("2026-02-28")),
    ["2026-01-07", "2026-01-21", "2026-02-04", "2026-02-18"]
  );
});

test("biweekly: anchor in the past — cycle stays aligned when window starts mid-cycle", () => {
  const t = tpl({ frequency: "biweekly", day_of_week: 3, anchor_date: "2026-01-07" });
  // Window starts Jan 15 → next on-cycle date is Jan 21, not Jan 15
  assert.deepEqual(
    getOccurrencesInRange(t, d("2026-01-15"), d("2026-02-10")),
    ["2026-01-21", "2026-02-04"]
  );
});

test("biweekly: every occurrence lands on the same weekday as the anchor", () => {
  const t = tpl({ frequency: "biweekly", day_of_week: 3, anchor_date: "2026-01-07" });
  const occ = getOccurrencesInRange(t, d("2026-01-01"), d("2026-06-30"));
  for (const iso of occ) assert.equal(d(iso).getDay(), 3);
});

test("biweekly: missing anchor_date yields no occurrences", () => {
  const t = tpl({ frequency: "biweekly", day_of_week: 3, anchor_date: null });
  assert.deepEqual(getOccurrencesInRange(t, d("2026-01-01"), d("2026-12-31")), []);
});

// ── yearly ───────────────────────────────────────────────────────────────────
test("yearly: single occurrence when the month falls in range", () => {
  const t = tpl({ frequency: "yearly", month_of_year: 3, day_of_month: 10 });
  assert.deepEqual(
    getOccurrencesInRange(t, d("2026-01-01"), d("2026-12-31")),
    ["2026-03-10"]
  );
});

test("yearly: none when the anniversary is outside the range", () => {
  const t = tpl({ frequency: "yearly", month_of_year: 3, day_of_month: 10 });
  assert.deepEqual(getOccurrencesInRange(t, d("2026-01-01"), d("2026-02-01")), []);
});

test("yearly: fires once per year across a multi-year range", () => {
  const t = tpl({ frequency: "yearly", month_of_year: 3, day_of_month: 10 });
  assert.deepEqual(
    getOccurrencesInRange(t, d("2025-01-01"), d("2027-12-31")),
    ["2025-03-10", "2026-03-10", "2027-03-10"]
  );
});

// ── empty / reversed ranges ──────────────────────────────────────────────────
test("end before start yields no occurrences", () => {
  const t = tpl({ frequency: "monthly", day_of_month: 15 });
  assert.deepEqual(getOccurrencesInRange(t, d("2026-03-01"), d("2026-01-01")), []);
});

// ── getNextOccurrence ────────────────────────────────────────────────────────
test("getNextOccurrence: same-month future day", () => {
  const t = tpl({ frequency: "monthly", day_of_month: 15 });
  assert.equal(getNextOccurrence(t, d("2026-01-10")), "2026-01-15");
});

test("getNextOccurrence: rolls to next month once the day has passed", () => {
  const t = tpl({ frequency: "monthly", day_of_month: 15 });
  assert.equal(getNextOccurrence(t, d("2026-01-20")), "2026-02-15");
});

test("getNextOccurrence: includes today (on/after is inclusive)", () => {
  const t = tpl({ frequency: "monthly", day_of_month: 15 });
  assert.equal(getNextOccurrence(t, d("2026-01-15")), "2026-01-15");
});

test("getNextOccurrence: yearly resolves within the 13-month lookahead", () => {
  const t = tpl({ frequency: "yearly", month_of_year: 3, day_of_month: 10 });
  assert.equal(getNextOccurrence(t, d("2026-05-01")), "2027-03-10");
});

// ── labels & equivalence ─────────────────────────────────────────────────────
test("describeSchedule: human labels per frequency", () => {
  assert.equal(describeSchedule(tpl({ frequency: "monthly", day_of_month: 15 })), "Día 15");
  assert.equal(describeSchedule(tpl({ frequency: "weekly", day_of_week: 1 })), "Cada lunes");
  assert.equal(
    describeSchedule(tpl({ frequency: "biweekly", day_of_week: 3, anchor_date: "2026-01-07" })),
    "Cada 2 semanas, miércoles"
  );
  assert.equal(
    describeSchedule(tpl({ frequency: "yearly", month_of_year: 3, day_of_month: 10 })),
    "10 de marzo"
  );
});

test("monthlyEquivalent: normalizes each frequency to a monthly figure", () => {
  assert.equal(monthlyEquivalent(tpl({ frequency: "monthly", amount: 500 })), 500);
  assert.ok(Math.abs(monthlyEquivalent(tpl({ frequency: "weekly", amount: 100 })) - 433.33) < 0.01);
  assert.ok(Math.abs(monthlyEquivalent(tpl({ frequency: "biweekly", amount: 100 })) - 216.67) < 0.01);
  assert.equal(monthlyEquivalent(tpl({ frequency: "yearly", amount: 1200 })), 100);
});
