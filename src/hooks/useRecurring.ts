import { useState, useEffect, useCallback } from "react";
import type { RecurringExpense } from "../types/database";
import { getRecurringExpenses, getAppliedRecurringIds } from "../services/recurringService";
import { onRecurringChange, onTransactionsChange } from "../lib/events";
import { getCurrentMonth } from "../lib/helpers";

export interface PendingItem {
  recurring: RecurringExpense;
  /** Local editable amount — pre-filled from template, user can adjust before confirming */
  editAmount: string;
}

interface UseRecurringResult {
  templates: RecurringExpense[];
  pendingItems: PendingItem[];
  setPendingItems: React.Dispatch<React.SetStateAction<PendingItem[]>>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useRecurring(): UseRecurringResult {
  const [templates, setTemplates] = useState<RecurringExpense[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const month = getCurrentMonth();
      const [all, appliedIds] = await Promise.all([
        getRecurringExpenses(),
        getAppliedRecurringIds(month),
      ]);
      setTemplates(all);
      setPendingItems(
        all
          .filter((r) => !appliedIds.has(r.id))
          .map((r) => ({ recurring: r, editAmount: String(r.amount) }))
      );
    } catch (e: any) {
      setError(e.message ?? "Error cargando recurrentes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => onRecurringChange(() => fetch()), [fetch]);
  useEffect(() => onTransactionsChange(() => fetch()), [fetch]);

  return { templates, pendingItems, setPendingItems, loading, error, refresh: fetch };
}
