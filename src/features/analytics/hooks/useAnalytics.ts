import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { BudgetItem } from "../../../types/database";
import type { MonthlySummary, EvolutionDataPoint, TimeRange } from "../models/types";
import { getTransactionsRange } from "../../../services/transactionsService";
import { getBudgetItemsRange } from "../../../services/budgetService";
import { getAccounts } from "../../../services/accountsService";
import { buildMultiMonthSummaries, buildEvolutionData } from "../services/aggregation";
import { currentMonth, shiftMonth, monthRange, monthBounds } from "../utils/math";
import { qk } from "../../../lib/queryClient";

interface UseAnalyticsResult {
  summaries: MonthlySummary[];
  evolutionData: EvolutionDataPoint[];
  currentSummary: MonthlySummary | null;
  previousSummary: MonthlySummary | null;
  loading: boolean;
  error: string | null;
  timeRange: TimeRange;
  setTimeRange: (r: TimeRange) => void;
  refresh: () => Promise<void>;
  hasEnoughData: boolean;
  months: string[];
}

const RANGE_MONTHS: Record<TimeRange, number> = {
  "3M": 3,
  "6M": 6,
  "12M": 12,
  ALL: 24,
};

export function useAnalytics(): UseAnalyticsResult {
  const [timeRange, setTimeRange] = useState<TimeRange>("6M");

  const now = useMemo(() => currentMonth(), []);
  const rangeMonths = RANGE_MONTHS[timeRange];
  const startMonth = useMemo(
    () => shiftMonth(now, -(rangeMonths - 1)),
    [now, rangeMonths]
  );
  const months = useMemo(() => monthRange(startMonth, now), [startMonth, now]);

  const query = useQuery({
    queryKey: qk.analytics(months),
    queryFn: async () => {
      const startBounds = monthBounds(months[0]);
      const endBounds = monthBounds(months[months.length - 1]);

      const [transactions, budgetItems, accounts] = await Promise.all([
        getTransactionsRange(startBounds.start, endBounds.end),
        getBudgetItemsRange(months),
        getAccounts(),
      ]);

      const budgetByMonth = new Map<string, BudgetItem[]>();
      for (const b of budgetItems) {
        const arr = budgetByMonth.get(b.month);
        if (arr) arr.push(b);
        else budgetByMonth.set(b.month, [b]);
      }

      return buildMultiMonthSummaries(transactions, budgetByMonth, accounts, months);
    },
  });

  const summaries = query.data ?? [];

  const evolutionData = useMemo(() => buildEvolutionData(summaries), [summaries]);

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  const currentSummary = summaries.length > 0 ? summaries[summaries.length - 1] : null;
  const previousSummary = summaries.length > 1 ? summaries[summaries.length - 2] : null;

  return {
    summaries,
    evolutionData,
    currentSummary,
    previousSummary,
    loading: query.isPending,
    error: query.error ? (query.error as Error).message : null,
    timeRange,
    setTimeRange,
    refresh,
    hasEnoughData: summaries.filter((s) => s.transactionCount > 0).length >= 3,
    months,
  };
}
