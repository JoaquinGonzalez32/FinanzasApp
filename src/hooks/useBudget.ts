import { useState, useEffect, useCallback } from "react";
import type { BudgetItem } from "../types/database";
import * as svc from "../services/budgetService";
import { onBudgetChange } from "../lib/events";

interface UseBudgetResult {
  budgetItems: BudgetItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useBudget(): UseBudgetResult {
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await svc.getBudgetItems();
      setBudgetItems(data);
    } catch (e: any) {
      setError(e.message ?? "Error loading budget");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    return onBudgetChange(() => {
      fetch();
    });
  }, [fetch]);

  return { budgetItems, loading, error, refresh: fetch };
}
