import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import type { RecurringTemplate, RecurringTemplateInsert } from "../types/database";
import { createTransaction } from "./transactionsService";
import { getCurrentMonth } from "../lib/helpers";
import { getOccurrencesInRange } from "../lib/recurringSchedule";

const AUTO_APPLIED_KEY = "recurring_auto_applied";

export async function getRecurringTemplates(): Promise<RecurringTemplate[]> {
  const { data, error } = await supabase
    .from("recurring_templates")
    .select("*, category:categories(*)")
    .eq("is_active", true)
    // day_of_month is now nullable (weekly/biweekly), so order by created_at
    // for a stable, frequency-agnostic ordering.
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createRecurringTemplate(
  item: RecurringTemplateInsert
): Promise<RecurringTemplate> {
  const { data, error } = await supabase
    .from("recurring_templates")
    .insert(item)
    .select("*, category:categories(*)")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRecurringTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from("recurring_templates")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Returns the set of `${recurring_id}|${date}` pairs that already have a
 * transaction in [start, end]. Per-date (not per-month) so weekly/biweekly
 * occurrences are tracked individually.
 */
async function getAppliedRecurringPairs(
  start: string,
  end: string
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("transactions")
    .select("recurring_id, date")
    .gte("date", start)
    .lte("date", end)
    .not("recurring_id", "is", null);

  if (error) throw error;
  return new Set(
    (data ?? [])
      .filter((t) => t.recurring_id)
      .map((t) => `${t.recurring_id}|${t.date}`)
  );
}

/** Locally-tracked `${id}|${date}` pairs auto-applied this month. */
async function getLocalAppliedPairs(month: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(AUTO_APPLIED_KEY);
    if (!raw) return new Set();
    const stored = JSON.parse(raw);
    if (stored.month !== month) return new Set(); // reset on month change
    return new Set(stored.keys ?? []);
  } catch {
    return new Set();
  }
}

/** Mark `${id}|${date}` pairs as auto-applied for this month. */
async function markLocalApplied(month: string, keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    const existing = await getLocalAppliedPairs(month);
    keys.forEach((k) => existing.add(k));
    await AsyncStorage.setItem(
      AUTO_APPLIED_KEY,
      JSON.stringify({ month, keys: [...existing] })
    );
  } catch {
    // non-critical
  }
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/**
 * Auto-applies every recurring occurrence due so far this month that isn't
 * already recorded. Back-fills occurrences missed while the app was closed.
 *
 * Two guards prevent unwanted re-creation:
 *   - DB check: a transaction with (recurring_id, date) already exists.
 *   - Local check (AsyncStorage): the occurrence was auto-applied then manually
 *     deleted — we respect the deletion and don't recreate it.
 *
 * The DB unique index idx_unique_recurring_date is the final backstop against
 * duplicate (recurring_id, date) rows.
 *
 * Returns the number of transactions created.
 */
export async function autoApplyRecurringTemplates(): Promise<number> {
  const today = new Date();
  const month = getCurrentMonth();
  const windowStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const startStr = fmtDate(windowStart);
  const todayStr = fmtDate(today);

  const all = await getRecurringTemplates();
  if (all.length === 0) return 0;

  // Enumerate every due occurrence (template, date) within this month.
  const due: { template: RecurringTemplate; date: string }[] = [];
  for (const t of all) {
    for (const date of getOccurrencesInRange(t, windowStart, today)) {
      due.push({ template: t, date });
    }
  }
  if (due.length === 0) return 0;

  const [dbApplied, localApplied] = await Promise.all([
    getAppliedRecurringPairs(startStr, todayStr),
    getLocalAppliedPairs(month),
  ]);

  const pending = due.filter(({ template, date }) => {
    const key = `${template.id}|${date}`;
    return !dbApplied.has(key) && !localApplied.has(key);
  });
  if (pending.length === 0) return 0;

  const newKeys: string[] = [];
  for (const { template, date } of pending) {
    const type = template.category?.type ?? "expense";
    try {
      await createTransaction({
        amount: template.amount,
        type,
        category_id: template.category_id,
        account_id: template.account_id ?? null,
        date,
        recurring_id: template.id,
      });
      newKeys.push(`${template.id}|${date}`);
    } catch {
      // Unique-index race or transient failure — skip this occurrence,
      // it'll be retried on the next auto-apply pass.
    }
  }

  await markLocalApplied(month, newKeys);
  return newKeys.length;
}
