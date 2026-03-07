import type { MonthlySummary, CategoryTrend, GlobalTrend, MonthAmount } from "../models/types";
import { movingAverage, detectDirection, percentChange, savingsRate } from "../utils/math";
import { getCategoryStyle } from "../../../lib/helpers";

const MA_WINDOW = 3;

/** Build category-level trends from multiple monthly summaries. */
export function buildCategoryTrends(
  summaries: MonthlySummary[],
  minMonths = 3,
): CategoryTrend[] {
  if (summaries.length < 2) return [];

  // Collect all expense categories across all months
  const catIds = new Set<string>();
  const catMeta = new Map<string, { name: string; icon: string; color: string }>();
  for (const s of summaries) {
    for (const c of s.byCategory) {
      if (c.type !== "expense") continue;
      catIds.add(c.categoryId);
      if (!catMeta.has(c.categoryId)) {
        catMeta.set(c.categoryId, {
          name: c.categoryName,
          icon: c.categoryIcon,
          color: c.categoryColor,
        });
      }
    }
  }

  const trends: CategoryTrend[] = [];

  for (const catId of catIds) {
    const meta = catMeta.get(catId)!;
    const monthlyAmounts: MonthAmount[] = summaries.map((s) => {
      const cat = s.byCategory.find((c) => c.categoryId === catId);
      return { month: s.month, amount: cat?.amount ?? 0 };
    });

    const amounts = monthlyAmounts.map((m) => m.amount);
    const ma = movingAverage(amounts, MA_WINDOW);
    const { direction, consecutiveMonths } = detectDirection(amounts, minMonths);

    const last = amounts[amounts.length - 1] ?? 0;
    const prev = amounts[amounts.length - 2] ?? 0;
    const avg = amounts.length > 0
      ? amounts.reduce((a, b) => a + b, 0) / amounts.length
      : 0;

    trends.push({
      categoryId: catId,
      categoryName: meta.name,
      categoryIcon: meta.icon,
      categoryColor: meta.color,
      monthlyAmounts,
      movingAverage: ma,
      direction,
      consecutiveMonths,
      percentChange: percentChange(prev, last),
      avgAmount: avg,
    });
  }

  return trends.sort((a, b) => b.avgAmount - a.avgAmount);
}

/** Build global (non-category) trends from monthly summaries. */
export function buildGlobalTrend(summaries: MonthlySummary[]): GlobalTrend {
  const monthlyExpenses: MonthAmount[] = summaries.map((s) => ({
    month: s.month,
    amount: s.totalExpense,
  }));
  const monthlyIncome: MonthAmount[] = summaries.map((s) => ({
    month: s.month,
    amount: s.totalIncome,
  }));
  const monthlySavingsRate = summaries.map((s) => ({
    month: s.month,
    rate: savingsRate(s.totalIncome, s.totalExpense),
  }));

  const expAmounts = monthlyExpenses.map((m) => m.amount);
  const incAmounts = monthlyIncome.map((m) => m.amount);
  const savAmounts = monthlySavingsRate.map((m) => m.rate);

  return {
    monthlyExpenses,
    monthlyIncome,
    monthlySavingsRate,
    expenseDirection: detectDirection(expAmounts).direction,
    incomeDirection: detectDirection(incAmounts).direction,
    savingsDirection: detectDirection(savAmounts).direction,
  };
}

/** Find categories with sustained budget overrun (N+ consecutive months). */
export function findOverBudgetCategories(
  summaries: MonthlySummary[],
  minConsecutive = 2,
): { categoryId: string; categoryName: string; months: number }[] {
  const catIds = new Set<string>();
  for (const s of summaries) {
    for (const c of s.byCategory) {
      if (c.budgetUsage !== null) catIds.add(c.categoryId);
    }
  }

  const results: { categoryId: string; categoryName: string; months: number }[] = [];

  for (const catId of catIds) {
    let consecutive = 0;
    let maxConsecutive = 0;
    let name = "";

    for (const s of summaries) {
      const cat = s.byCategory.find((c) => c.categoryId === catId);
      if (cat && cat.budgetUsage !== null && cat.budgetUsage > 100) {
        consecutive++;
        maxConsecutive = Math.max(maxConsecutive, consecutive);
        name = cat.categoryName;
      } else {
        consecutive = 0;
      }
    }

    if (maxConsecutive >= minConsecutive) {
      results.push({ categoryId: catId, categoryName: name, months: maxConsecutive });
    }
  }

  return results;
}

/** Find spike anomalies in the latest month vs the moving average. */
export function findSpikes(
  summaries: MonthlySummary[],
  thresholdPercent = 40,
): { categoryId: string; categoryName: string; current: number; average: number; excessPercent: number }[] {
  if (summaries.length < MA_WINDOW) return [];

  const latest = summaries[summaries.length - 1];
  const previous = summaries.slice(0, -1);

  const results: { categoryId: string; categoryName: string; current: number; average: number; excessPercent: number }[] = [];

  for (const cat of latest.byCategory) {
    if (cat.type !== "expense") continue;
    const prevAmounts = previous.map(
      (s) => s.byCategory.find((c) => c.categoryId === cat.categoryId)?.amount ?? 0,
    );
    const avg = prevAmounts.length > 0
      ? prevAmounts.reduce((a, b) => a + b, 0) / prevAmounts.length
      : 0;
    if (avg <= 0) continue;

    const excess = ((cat.amount - avg) / avg) * 100;
    if (excess > thresholdPercent) {
      results.push({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        current: cat.amount,
        average: avg,
        excessPercent: Math.round(excess),
      });
    }
  }

  return results.sort((a, b) => b.excessPercent - a.excessPercent);
}
