import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import type { RecurringTemplate, RecurringTemplateInsert } from "../types/database";
import { createTransaction } from "./transactionsService";
import { getCurrentMonth } from "../lib/helpers";

const AUTO_APPLIED_KEY = "recurring_auto_applied";

export async function getRecurringTemplates(): Promise<RecurringTemplate[]> {
  const { data, error } = await supabase
    .from("recurring_templates")
    .select("*, category:categories(*)")
    .eq("is_active", true)
    .order("day_of_month", { ascending: true });

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
 * Returns the set of recurring template IDs that already have a transaction
 * in the given month (YYYY-MM). Used to determine which templates are still pending.
 */
export async function getAppliedRecurringIds(month: string): Promise<Set<string>> {
  const [year, m] = month.split("-").map(Number);
  const start = `${year}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(year, m, 0).getDate();
  const end = `${year}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("transactions")
    .select("recurring_id")
    .gte("date", start)
    .lte("date", end)
    .not("recurring_id", "is", null);

  if (error) throw error;
  return new Set((data ?? []).map((t) => t.recurring_id).filter(Boolean));
}

/** Get the set of template IDs already auto-applied this month (stored locally). */
async function getLocalAppliedIds(month: string): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(AUTO_APPLIED_KEY);
    if (!raw) return new Set();
    const stored = JSON.parse(raw);
    // Reset if month changed
    if (stored.month !== month) return new Set();
    return new Set(stored.ids ?? []);
  } catch {
    return new Set();
  }
}

/** Mark template IDs as auto-applied for this month. */
async function markLocalApplied(month: string, ids: string[]): Promise<void> {
  try {
    const existing = await getLocalAppliedIds(month);
    ids.forEach((id) => existing.add(id));
    await AsyncStorage.setItem(
      AUTO_APPLIED_KEY,
      JSON.stringify({ month, ids: [...existing] })
    );
  } catch {
    // non-critical
  }
}

/**
 * Auto-applies recurring templates whose day_of_month <= today
 * and that haven't been applied yet this month.
 * Uses both DB check (transaction exists) and local tracking (AsyncStorage)
 * so manually deleted transactions don't get re-created.
 * Returns the number of transactions created.
 */
export async function autoApplyRecurringTemplates(): Promise<number> {
  const today = new Date();
  const dayOfMonth = today.getDate();
  const month = getCurrentMonth();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(dayOfMonth).padStart(2, "0")}`;

  const [all, dbAppliedIds, localAppliedIds] = await Promise.all([
    getRecurringTemplates(),
    getAppliedRecurringIds(month),
    getLocalAppliedIds(month),
  ]);

  const due = all.filter(
    (t) =>
      t.day_of_month <= dayOfMonth &&
      !dbAppliedIds.has(t.id) &&
      !localAppliedIds.has(t.id)
  );

  if (due.length === 0) return 0;

  const newIds: string[] = [];
  for (const t of due) {
    const type = t.category?.type ?? "expense";
    await createTransaction({
      amount: t.amount,
      type,
      category_id: t.category_id,
      account_id: t.account_id ?? null,
      date: dateStr,
      recurring_id: t.id,
    });
    newIds.push(t.id);
  }

  await markLocalApplied(month, newIds);
  return newIds.length;
}
