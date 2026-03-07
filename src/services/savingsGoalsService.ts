import { supabase } from "../lib/supabase";
import type { SavingsGoal, SavingsGoalInsert, GoalContribution } from "../types/database";
import { emitSavingsGoalsChange } from "../lib/events";

export async function getGoalsByAccount(accountId: string): Promise<SavingsGoal[]> {
  const { data, error } = await supabase
    .from("savings_goals")
    .select("*")
    .eq("account_id", accountId)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getAllActiveGoals(): Promise<SavingsGoal[]> {
  const { data, error } = await supabase
    .from("savings_goals")
    .select("*")
    .eq("status", "active")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getAllGoals(): Promise<SavingsGoal[]> {
  const { data, error } = await supabase
    .from("savings_goals")
    .select("*")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getGoal(id: string): Promise<SavingsGoal> {
  const { data, error } = await supabase
    .from("savings_goals")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function createGoal(goal: SavingsGoalInsert): Promise<SavingsGoal> {
  const { data, error } = await supabase
    .from("savings_goals")
    .insert(goal)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateGoal(
  id: string,
  updates: Partial<Pick<SavingsGoal, "name" | "target_amount" | "deadline" | "icon" | "color" | "priority" | "status">>
): Promise<void> {
  const { error } = await supabase
    .from("savings_goals")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase
    .from("savings_goals")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export function pauseGoal(id: string) {
  return updateGoal(id, { status: "paused" });
}

export function resumeGoal(id: string) {
  return updateGoal(id, { status: "active" });
}

export function completeGoal(id: string) {
  return updateGoal(id, { status: "completed" });
}

export function cancelGoal(id: string) {
  return updateGoal(id, { status: "cancelled" });
}

export async function addContribution(
  goalId: string,
  amount: number,
  note?: string
): Promise<void> {
  const { error } = await supabase.rpc("add_goal_contribution", {
    p_goal_id: goalId,
    p_amount: amount,
    p_note: note ?? null,
  });

  if (error) throw error;
  emitSavingsGoalsChange();
}

export async function removeContribution(contributionId: string): Promise<void> {
  const { error } = await supabase.rpc("remove_goal_contribution", {
    p_contribution_id: contributionId,
  });

  if (error) throw error;
  emitSavingsGoalsChange();
}

export async function getContributions(goalId: string): Promise<GoalContribution[]> {
  const { data, error } = await supabase
    .from("goal_contributions")
    .select("*")
    .eq("goal_id", goalId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
