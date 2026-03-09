import type { SavingsGoal } from "../../../types/database";
import type { Insight } from "../../analytics/models/types";
import { goalProgress, goalPaceStatus, goalRemaining, formatTimeRemaining } from "../../../lib/goalHelpers";
import { formatCurrency } from "../../../lib/helpers";

export type BannerSeverity = "critical" | "warning" | "info" | "success";

export interface HomeBanner {
  id: string;
  severity: BannerSeverity;
  icon: string;
  message: string;
  route?: string;
  routeParams?: Record<string, string>;
  dismissable: boolean;
}

const SEVERITY_PRIORITY: Record<BannerSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  success: 3,
};

interface CategoryAlert {
  name: string;
  icon: string;
  spent: number;
  planned: number;
  pct: number;
  remaining: number;
  accountName?: string;
  currency?: string;
}

export function buildBudgetBanners(
  categoryAlerts: CategoryAlert[],
  currency?: string,
): HomeBanner[] {
  return categoryAlerts
    .filter((a) => a.pct >= 100)
    .slice(0, 2)
    .map((a) => {
      const cur = a.currency ?? currency;
      const acctSuffix = a.accountName ? ` en ${a.accountName}` : "";
      return {
        id: `budget_exceeded_${a.name}`,
        severity: "critical" as BannerSeverity,
        icon: "warning",
        message: `Superaste ${a.name}${acctSuffix} por ${formatCurrency(Math.abs(a.remaining), cur)}`,
        route: "/(tabs)/dashboard",
        dismissable: true,
      };
    });
}

export function buildGoalBanners(
  goals: SavingsGoal[],
  currency?: string,
  accountMap?: Record<string, { name: string }>,
): HomeBanner[] {
  const banners: HomeBanner[] = [];

  for (const goal of goals) {
    const pct = goalProgress(goal);
    const pace = goalPaceStatus(goal);
    const acctName = accountMap?.[goal.account_id]?.name;
    const acctSuffix = acctName ? ` en ${acctName}` : "";
    const goalCurrency = goal.currency ?? currency;

    if (pct >= 80 && pct < 100) {
      const remaining = goalRemaining(goal);
      banners.push({
        id: `goal_near_${goal.id}`,
        severity: "success",
        icon: "emoji-events",
        message: `${goal.name}${acctSuffix} al ${Math.round(pct)}% — faltan ${formatCurrency(remaining, goalCurrency)}`,
        route: "/goal-detail",
        routeParams: { id: goal.id },
        dismissable: true,
      });
    } else if (pace === "behind") {
      banners.push({
        id: `goal_behind_${goal.id}`,
        severity: "warning",
        icon: "schedule",
        message: `${goal.name}${acctSuffix} esta atrasada${goal.deadline ? ` — ${formatTimeRemaining(goal.deadline)}` : ""}`,
        route: "/goal-detail",
        routeParams: { id: goal.id },
        dismissable: true,
      });
    }
  }

  return banners;
}

export function buildInsightBanners(insights: Insight[]): HomeBanner[] {
  return insights
    .filter((i) => i.status !== "dismissed")
    .slice(0, 2)
    .map((i) => ({
      id: `insight_${i.type}_${i.categoryId ?? "global"}`,
      severity: i.severity === "critical" ? "warning" as BannerSeverity : i.severity === "info" ? "success" as BannerSeverity : "warning" as BannerSeverity,
      icon: i.severity === "critical" ? "trending-up" : i.severity === "info" ? "thumb-up" : "info",
      message: i.message,
      route: "/analytics",
      dismissable: true,
    }));
}

export function buildPendingRecurringBanner(count: number): HomeBanner | null {
  if (count <= 0) return null;
  return {
    id: "pending_recurring",
    severity: "info",
    icon: "repeat",
    message: `${count} recurrente${count !== 1 ? "s" : ""} pendiente${count !== 1 ? "s" : ""}`,
    route: "/recurring",
    dismissable: true,
  };
}

export function prioritizeBanners(banners: HomeBanner[], max: number): HomeBanner[] {
  return [...banners]
    .sort((a, b) => SEVERITY_PRIORITY[a.severity] - SEVERITY_PRIORITY[b.severity])
    .slice(0, max);
}
