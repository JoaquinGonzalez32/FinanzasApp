import type { SavingsGoal, GoalContribution, GoalStatus } from "../types/database";

export function goalProgress(goal: SavingsGoal): number {
  if (goal.target_amount <= 0) return 0;
  return Math.min((goal.current_amount / goal.target_amount) * 100, 100);
}

export function goalRemaining(goal: SavingsGoal): number {
  return Math.max(goal.target_amount - goal.current_amount, 0);
}

type PaceStatus = "on_track" | "behind" | "ahead" | "no_deadline";

export function goalPaceStatus(goal: SavingsGoal): PaceStatus {
  if (!goal.deadline) return "no_deadline";

  const now = new Date();
  const created = new Date(goal.created_at);
  const deadline = new Date(goal.deadline);

  const totalMs = deadline.getTime() - created.getTime();
  if (totalMs <= 0) return "behind";

  const elapsedMs = now.getTime() - created.getTime();
  const elapsedPct = (elapsedMs / totalMs) * 100;
  const progressPct = goalProgress(goal);

  if (progressPct >= elapsedPct + 5) return "ahead";
  if (progressPct < elapsedPct - 5) return "behind";
  return "on_track";
}

export function goalRequiredRate(goal: SavingsGoal): { daily: number; weekly: number; monthly: number; daysRemaining: number } | null {
  if (!goal.deadline) return null;

  const now = new Date();
  const deadline = new Date(goal.deadline);
  const diffMs = deadline.getTime() - now.getTime();
  const daysRemaining = Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)), 0);

  if (daysRemaining <= 0) return { daily: 0, weekly: 0, monthly: 0, daysRemaining: 0 };

  const remaining = goalRemaining(goal);
  const daily = remaining / daysRemaining;

  return {
    daily,
    weekly: daily * 7,
    monthly: daily * 30,
    daysRemaining,
  };
}

export function goalProjectedDate(goal: SavingsGoal, contributions: GoalContribution[]): Date | null {
  const avg = avgMonthlyContribution(goal, contributions);
  if (avg <= 0) return null;

  const remaining = goalRemaining(goal);
  if (remaining <= 0) return new Date();

  const monthsNeeded = remaining / avg;
  const projected = new Date();
  projected.setMonth(projected.getMonth() + Math.ceil(monthsNeeded));
  return projected;
}

export function avgMonthlyContribution(goal: SavingsGoal, contributions: GoalContribution[]): number {
  if (contributions.length === 0) return 0;

  const sorted = [...contributions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const first = new Date(sorted[0].created_at);
  const now = new Date();
  const months = Math.max(
    (now.getFullYear() - first.getFullYear()) * 12 + (now.getMonth() - first.getMonth()),
    1
  );

  const total = contributions.reduce((s, c) => s + Number(c.amount), 0);
  return total / months;
}

export function formatTimeRemaining(deadline: string): string {
  const now = new Date();
  const d = new Date(deadline);
  const diffMs = d.getTime() - now.getTime();

  if (diffMs <= 0) return "Vencida";

  const totalDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (totalDays < 30) {
    return `${totalDays} dia${totalDays !== 1 ? "s" : ""}`;
  }

  const months = Math.floor(totalDays / 30);
  const days = totalDays % 30;

  if (days === 0) {
    return `${months} mes${months !== 1 ? "es" : ""}`;
  }

  return `${months} mes${months !== 1 ? "es" : ""}, ${days} dia${days !== 1 ? "s" : ""}`;
}

export function paceLabel(status: PaceStatus): { text: string; color: string } {
  switch (status) {
    case "ahead":
      return { text: "Adelantada", color: "#10b981" };
    case "on_track":
      return { text: "En ritmo", color: "#137fec" };
    case "behind":
      return { text: "Atrasada", color: "#f59e0b" };
    case "no_deadline":
      return { text: "Sin plazo", color: "#64748b" };
  }
}

export function goalStatusLabel(status: GoalStatus): string {
  switch (status) {
    case "active":
      return "Activa";
    case "completed":
      return "Completada";
    case "paused":
      return "Pausada";
    case "cancelled":
      return "Cancelada";
  }
}
