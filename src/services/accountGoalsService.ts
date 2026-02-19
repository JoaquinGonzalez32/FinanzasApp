import { supabase } from "../lib/supabase";
import type { AccountGoal, AccountGoalInsert } from "../types/database";

export async function getAccountGoals(accountId: string): Promise<AccountGoal[]> {
  const { data, error } = await supabase
    .from("account_goals")
    .select("*, category:categories(*)")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createAccountGoal(goal: AccountGoalInsert): Promise<AccountGoal> {
  const { data, error } = await supabase
    .from("account_goals")
    .insert(goal)
    .select("*, category:categories(*)")
    .single();

  if (error) throw error;
  return data;
}

export async function updateAccountGoal(
  id: string,
  updates: Partial<AccountGoalInsert>
): Promise<void> {
  const { error } = await supabase
    .from("account_goals")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteAccountGoal(id: string): Promise<void> {
  const { error } = await supabase
    .from("account_goals")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function getCategoryAccountSum(
  categoryId: string,
  accountId: string
): Promise<number> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*, category:categories(*)")
    .eq("category_id", categoryId);

  if (error) throw error;

  return (data ?? [])
    .filter((t: any) => (t.account_id ?? t.category?.account_id) === accountId)
    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
}
