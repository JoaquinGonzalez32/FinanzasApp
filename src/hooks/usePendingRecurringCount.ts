import { useState, useEffect, useCallback } from "react";
import { getRecurringExpenses, getAppliedRecurringIds } from "../services/recurringService";
import { onRecurringChange, onTransactionsChange } from "../lib/events";
import { getCurrentMonth } from "../lib/helpers";

/**
 * Lightweight hook — returns only the count of pending recurring expenses this month.
 * Used by the home screen banner to avoid fetching full template data.
 */
export function usePendingRecurringCount(): number {
  const [count, setCount] = useState(0);

  const check = useCallback(async () => {
    try {
      const month = getCurrentMonth();
      const [all, appliedIds] = await Promise.all([
        getRecurringExpenses(),
        getAppliedRecurringIds(month),
      ]);
      setCount(all.filter((r) => !appliedIds.has(r.id)).length);
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => { check(); }, [check]);
  useEffect(() => onRecurringChange(() => check()), [check]);
  useEffect(() => onTransactionsChange(() => check()), [check]);

  return count;
}
