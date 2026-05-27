import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Category, TransactionType } from "../types/database";
import * as svc from "../services/categoriesService";
import { qk } from "../lib/queryClient";

interface UseCategoriesResult {
  categories: Category[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCategories(type?: TransactionType): UseCategoriesResult {
  const query = useQuery({
    queryKey: qk.categories(type),
    queryFn: () => svc.getCategories(type),
  });

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    categories: query.data ?? [],
    loading: query.isPending,
    error: query.error ? (query.error as Error).message : null,
    refresh,
  };
}
