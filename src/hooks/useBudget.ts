import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { BudgetItem } from "../types/database";
import * as svc from "../services/budgetService";
import { qk } from "../lib/queryClient";

interface UseBudgetResult {
  budgetItems: BudgetItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useBudget(month: string): UseBudgetResult {
  const query = useQuery({
    queryKey: qk.budget(month),
    queryFn: () => svc.getBudgetItems(month),
  });

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    budgetItems: query.data ?? [],
    loading: query.isPending,
    error: query.error ? (query.error as Error).message : null,
    refresh,
  };
}
