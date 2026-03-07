import { useState, useEffect, useCallback } from "react";
import type { PeriodComparison, PeriodDef } from "../models/types";
import { getTransactionsRange } from "../../../services/transactionsService";
import { comparePeriods, monthToPeriod } from "../services/comparison";

interface UseComparisonResult {
  comparison: PeriodComparison | null;
  loading: boolean;
  error: string | null;
  monthA: string;
  monthB: string;
  setMonthA: (m: string) => void;
  setMonthB: (m: string) => void;
  refresh: () => Promise<void>;
}

export function useComparison(
  initialMonthA: string,
  initialMonthB: string,
  currency?: string,
): UseComparisonResult {
  const [monthA, setMonthA] = useState(initialMonthA);
  const [monthB, setMonthB] = useState(initialMonthB);
  const [comparison, setComparison] = useState<PeriodComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const periodA = monthToPeriod(monthA);
      const periodB = monthToPeriod(monthB);

      const [txA, txB] = await Promise.all([
        getTransactionsRange(periodA.start, periodA.end),
        getTransactionsRange(periodB.start, periodB.end),
      ]);

      const result = comparePeriods(periodA, txA, periodB, txB, currency);
      setComparison(result);
    } catch (e: any) {
      setError(e.message ?? "Error comparando periodos");
    } finally {
      setLoading(false);
    }
  }, [monthA, monthB, currency]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    comparison,
    loading,
    error,
    monthA,
    monthB,
    setMonthA,
    setMonthB,
    refresh: fetch,
  };
}
