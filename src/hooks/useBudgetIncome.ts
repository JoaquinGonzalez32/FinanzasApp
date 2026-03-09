import { useState, useEffect, useCallback } from "react";
import type { Transaction } from "../types/database";
import { getBudgetMonthIncome } from "../services/transactionsService";
import { onTransactionsChange } from "../lib/events";

/**
 * Fetches income transactions assigned to a specific budget month.
 * Includes income with explicit budget_month AND income with null budget_month
 * whose date falls within the month.
 */
export function useBudgetIncome(month: string) {
  const [income, setIncome] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBudgetMonthIncome(month);
      setIncome(data);
    } catch {
      // Silently fail — income will be 0
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    return onTransactionsChange(() => {
      fetch();
    });
  }, [fetch]);

  return { income, loading, refresh: fetch };
}
