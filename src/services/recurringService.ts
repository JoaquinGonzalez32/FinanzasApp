/**
 * Supabase migration — run once in the SQL editor:
 *
 * CREATE TABLE recurring_expenses (
 *   id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
 *   category_id   uuid REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
 *   account_id    uuid REFERENCES accounts(id)   ON DELETE SET NULL,
 *   amount        numeric NOT NULL DEFAULT 0,
 *   day_of_month  integer NOT NULL CHECK (day_of_month BETWEEN 1 AND 28),
 *   is_active     boolean NOT NULL DEFAULT true,
 *   created_at    timestamptz DEFAULT now() NOT NULL
 * );
 * ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Users manage own recurring" ON recurring_expenses
 *   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
 *
 * ALTER TABLE transactions
 *   ADD COLUMN IF NOT EXISTS recurring_id uuid REFERENCES recurring_expenses(id) ON DELETE SET NULL;
 */

import { supabase } from "../lib/supabase";
import type { RecurringExpense, RecurringExpenseInsert } from "../types/database";

export async function getRecurringExpenses(): Promise<RecurringExpense[]> {
  const { data, error } = await supabase
    .from("recurring_expenses")
    .select("*, category:categories(*)")
    .eq("is_active", true)
    .order("day_of_month", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createRecurringExpense(
  item: RecurringExpenseInsert
): Promise<RecurringExpense> {
  const { data, error } = await supabase
    .from("recurring_expenses")
    .insert(item)
    .select("*, category:categories(*)")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRecurringExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from("recurring_expenses")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

/**
 * Returns the set of recurring_expense IDs that already have a transaction
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
