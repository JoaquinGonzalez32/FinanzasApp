import { useMemo } from "react";
import type { MonthlySummary, CategoryTrend, GlobalTrend } from "../models/types";
import { buildCategoryTrends, buildGlobalTrend } from "../services/trends";

interface UseTrendsResult {
  categoryTrends: CategoryTrend[];
  globalTrend: GlobalTrend | null;
  hasEnoughData: boolean;
}

export function useTrends(summaries: MonthlySummary[]): UseTrendsResult {
  const hasEnoughData = summaries.filter((s) => s.transactionCount > 0).length >= 3;

  const categoryTrends = useMemo(
    () => (hasEnoughData ? buildCategoryTrends(summaries) : []),
    [summaries, hasEnoughData],
  );

  const globalTrend = useMemo(
    () => (hasEnoughData ? buildGlobalTrend(summaries) : null),
    [summaries, hasEnoughData],
  );

  return { categoryTrends, globalTrend, hasEnoughData };
}
