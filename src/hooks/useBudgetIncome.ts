import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Transaction } from "../types/database";
import { getBudgetMonthIncome } from "../services/transactionsService";
import { qk } from "../lib/queryClient";

/**
 * Fetches income transactions assigned to a specific budget month.
 * Includes income with explicit budget_month AND income with null budget_month
 * whose date falls within the month.
 */
export function useBudgetIncome(month: string) {
  const query = useQuery({
    queryKey: qk.budgetIncome(month),
    queryFn: async () => {
      try {
        return await getBudgetMonthIncome(month);
      } catch {
        return [] as Transaction[];
      }
    },
  });

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    income: query.data ?? [],
    loading: query.isPending,
    refresh,
  };
}
