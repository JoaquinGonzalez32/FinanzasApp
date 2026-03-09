import { useState, useEffect, useCallback, useMemo } from "react";
import type { Transaction, BudgetItem, Account } from "../../../types/database";
import type { MonthlySummary, EvolutionDataPoint, TimeRange } from "../models/types";
import { getTransactionsRange } from "../../../services/transactionsService";
import { getBudgetItemsRange } from "../../../services/budgetService";
import { getAccounts } from "../../../services/accountsService";
import { buildMultiMonthSummaries, buildEvolutionData } from "../services/aggregation";
import { currentMonth, shiftMonth, monthRange, monthBounds } from "../utils/math";
import { onTransactionsChange } from "../../../lib/events";

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
  const [summaries, setSummaries] = useState<MonthlySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("6M");

  const now = useMemo(() => currentMonth(), []);
  const rangeMonths = RANGE_MONTHS[timeRange];
  const startMonth = useMemo(() => shiftMonth(now, -(rangeMonths - 1)), [now, rangeMonths]);
  const months = useMemo(() => monthRange(startMonth, now), [startMonth, now]);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
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

      const result = buildMultiMonthSummaries(transactions, budgetByMonth, accounts, months);
      setSummaries(result);
    } catch (e: any) {
      setError(e.message ?? "Error cargando analytics");
    } finally {
      setLoading(false);
    }
  }, [months]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    return onTransactionsChange(() => { fetch(); });
  }, [fetch]);

  const evolutionData = useMemo(() => buildEvolutionData(summaries), [summaries]);

  const currentSummary = summaries.length > 0 ? summaries[summaries.length - 1] : null;
  const previousSummary = summaries.length > 1 ? summaries[summaries.length - 2] : null;

  return {
    summaries,
    evolutionData,
    currentSummary,
    previousSummary,
    loading,
    error,
    timeRange,
    setTimeRange,
    refresh: fetch,
    hasEnoughData: summaries.filter((s) => s.transactionCount > 0).length >= 3,
    months,
  };
}
