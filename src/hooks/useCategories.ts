import { useState, useEffect, useCallback } from "react";
import type { Category, TransactionType } from "../types/database";
import * as svc from "../services/categoriesService";
import { onCategoriesChange } from "../lib/events";

interface UseCategoriesResult {
  categories: Category[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCategories(type?: TransactionType): UseCategoriesResult {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await svc.getCategories(type);
      setCategories(data);
    } catch (e: any) {
      setError(e.message ?? "Error loading categories");
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    return onCategoriesChange(() => {
      fetch();
    });
  }, [fetch]);

  return { categories, loading, error, refresh: fetch };
}
