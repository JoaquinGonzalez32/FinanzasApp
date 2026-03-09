import type { MonthlySummary, Insight, InsightSeverity, InsightType } from "../models/types";
import { buildCategoryTrends, findOverBudgetCategories, findSpikes, buildGlobalTrend } from "./trends";
import { formatCurrency } from "../../../lib/helpers";

let idCounter = 0;
function uid(): string {
  return `insight_${Date.now()}_${++idCounter}`;
}

/** Generate all insights from monthly summaries. */
export function generateInsights(
  summaries: MonthlySummary[],
  currency?: string,
): Insight[] {
  if (summaries.length < 2) return [];

  const insights: Insight[] = [];
  const now = new Date().toISOString();
  const fmt = (n: number) => formatCurrency(n, currency);

  // 1. Category trends (rising/falling 3+ months)
  const categoryTrends = buildCategoryTrends(summaries, 3);
  for (const trend of categoryTrends) {
    if (trend.direction === "stable") continue;
    if (trend.consecutiveMonths < 3) continue;

    const amounts = trend.monthlyAmounts.slice(-trend.consecutiveMonths);
    const amountStr = amounts.map((a) => fmt(a.amount)).join(" -> ");

    if (trend.direction === "up") {
      insights.push({
        id: uid(),
        type: "trend_rising",
        severity: "critical",
        status: "new",
        categoryId: trend.categoryId,
        categoryName: trend.categoryName,
        categoryIcon: trend.categoryIcon,
        categoryColor: trend.categoryColor,
        message: `Tu gasto en ${trend.categoryName} viene subiendo hace ${trend.consecutiveMonths} meses seguidos`,
        detail: amountStr,
        data: { consecutiveMonths: trend.consecutiveMonths, percentChange: trend.percentChange },
        createdAt: now,
      });
    } else {
      insights.push({
        id: uid(),
        type: "trend_falling",
        severity: "info",
        status: "new",
        categoryId: trend.categoryId,
        categoryName: trend.categoryName,
        categoryIcon: trend.categoryIcon,
        categoryColor: trend.categoryColor,
        message: `Bien! Tu gasto en ${trend.categoryName} viene bajando hace ${trend.consecutiveMonths} meses`,
        detail: amountStr,
        data: { consecutiveMonths: trend.consecutiveMonths, percentChange: trend.percentChange },
        createdAt: now,
      });
    }
  }

  // 2. Spikes (current month >> average)
  const spikes = findSpikes(summaries, 40);
  for (const spike of spikes) {
    insights.push({
      id: uid(),
      type: "spike",
      severity: "warning",
      status: "new",
      categoryId: spike.categoryId,
      categoryName: spike.categoryName,
      message: `Gastaste ${spike.excessPercent}% mas en ${spike.categoryName} este mes comparado con tu promedio`,
      detail: `Actual: ${fmt(spike.current)} vs Promedio: ${fmt(spike.average)}`,
      data: { current: spike.current, average: spike.average, excessPercent: spike.excessPercent },
      createdAt: now,
    });
  }

  // 3. Over budget categories (2+ months)
  const overBudget = findOverBudgetCategories(summaries, 2);
  for (const ob of overBudget) {
    insights.push({
      id: uid(),
      type: "over_budget",
      severity: "critical",
      status: "new",
      categoryId: ob.categoryId,
      categoryName: ob.categoryName,
      message: `Llevas ${ob.months} meses superando el presupuesto de ${ob.categoryName}`,
      createdAt: now,
    });
  }

  // 4. Savings rate changes
  if (summaries.length >= 2) {
    const current = summaries[summaries.length - 1];
    const previous = summaries[summaries.length - 2];
    const rateDiff = current.savingsRate - previous.savingsRate;

    if (rateDiff >= 5) {
      insights.push({
        id: uid(),
        type: "savings_improved",
        severity: "info",
        status: "new",
        message: `Tu tasa de ahorro mejoro un ${Math.round(rateDiff)}% respecto al mes pasado`,
        detail: `${Math.round(previous.savingsRate)}% -> ${Math.round(current.savingsRate)}%`,
        data: { previous: previous.savingsRate, current: current.savingsRate },
        createdAt: now,
      });
    } else if (rateDiff <= -5) {
      insights.push({
        id: uid(),
        type: "savings_declined",
        severity: "warning",
        status: "new",
        message: `Tu tasa de ahorro bajo un ${Math.round(Math.abs(rateDiff))}% respecto al mes pasado`,
        detail: `${Math.round(previous.savingsRate)}% -> ${Math.round(current.savingsRate)}%`,
        data: { previous: previous.savingsRate, current: current.savingsRate },
        createdAt: now,
      });
    }
  }

  // Sort: critical first, then warning, then info
  const severityOrder: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2 };
  insights.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return insights;
}

/** Get the single most relevant insight for the home widget. */
export function getTopInsight(insights: Insight[]): Insight | null {
  const active = insights.filter((i) => i.status !== "dismissed");
  return active[0] ?? null;
}
