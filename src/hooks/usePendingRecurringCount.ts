import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { autoApplyRecurringTemplates } from "../services/recurringService";
import { qk, invalidate } from "../lib/queryClient";

/**
 * Auto-applies recurring templates on mount (and when recurring changes).
 * Returns the number of transactions that were auto-created this run.
 */
export function useAutoApplyRecurring(): number {
  const query = useQuery({
    queryKey: qk.pendingRecurringCount,
    queryFn: async () => {
      try {
        return await autoApplyRecurringTemplates();
      } catch {
        return 0;
      }
    },
  });

  // If auto-application created transactions, cascade-invalidate.
  useEffect(() => {
    if (typeof query.data === "number" && query.data > 0) {
      invalidate.transactions();
    }
  }, [query.data]);

  return query.data ?? 0;
}
