import { useState, useEffect, useCallback } from "react";
import { autoApplyRecurringTemplates } from "../services/recurringService";
import { onRecurringChange } from "../lib/events";
import { emitTransactionsChange } from "../lib/events";

/**
 * Auto-applies recurring templates on mount (and when recurring changes).
 * Returns the number of transactions that were auto-created this run.
 */
export function useAutoApplyRecurring(): number {
  const [applied, setApplied] = useState(0);

  const run = useCallback(async () => {
    try {
      const count = await autoApplyRecurringTemplates();
      setApplied(count);
      if (count > 0) emitTransactionsChange();
    } catch {
      setApplied(0);
    }
  }, []);

  useEffect(() => { run(); }, [run]);
  useEffect(() => onRecurringChange(() => run()), [run]);

  return applied;
}
