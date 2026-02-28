import { supabase } from "../lib/supabase";
import type { BudgetItem, BudgetItemInsert } from "../types/database";

// DROP TABLE IF EXISTS budget_items;
// CREATE TABLE budget_items (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
//   category_id uuid REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
//   account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
//   percentage numeric NOT NULL DEFAULT 0,
//   month TEXT NOT NULL,
//   sort_order integer NOT NULL DEFAULT 0,
//   created_at timestamptz DEFAULT now()
// );
// ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Users can manage own budget items" ON budget_items
//   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
// -- UNIQUE constraint needed to prevent duplicates:
// ALTER TABLE budget_items ADD CONSTRAINT budget_items_user_month_category_unique
//   UNIQUE (user_id, month, category_id);

export async function getBudgetItems(month: string): Promise<BudgetItem[]> {
  const { data, error } = await supabase
    .from("budget_items")
    .select("*, category:categories(*)")
    .eq("month", month)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createBudgetItem(
  item: BudgetItemInsert
): Promise<BudgetItem> {
  const { data, error } = await supabase
    .from("budget_items")
    .insert(item)
    .select("*, category:categories(*)")
    .single();

  if (error) throw error;
  return data;
}

export async function updateBudgetItem(
  id: string,
  updates: Partial<BudgetItemInsert>
): Promise<void> {
  const { error } = await supabase
    .from("budget_items")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteBudgetItem(id: string): Promise<void> {
  const { error } = await supabase.from("budget_items").delete().eq("id", id);
  if (error) throw error;
}
