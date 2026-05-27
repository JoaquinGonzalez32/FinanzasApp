import { useCallback, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { RecurringTemplate } from "../types/database";
import {
  getRecurringTemplates,
  getAppliedRecurringIds,
} from "../services/recurringService";
import { getCurrentMonth } from "../lib/helpers";
import { qk } from "../lib/queryClient";

export interface PendingItem {
  recurring: RecurringTemplate;
  /** Local editable amount — pre-filled from template, user can adjust before confirming */
  editAmount: string;
}

interface UseRecurringResult {
  templates: RecurringTemplate[];
  pendingItems: PendingItem[];
  setPendingItems: React.Dispatch<React.SetStateAction<PendingItem[]>>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useRecurring(): UseRecurringResult {
  const query = useQuery({
    queryKey: qk.recurring,
    queryFn: async () => {
      const month = getCurrentMonth();
      const [all, appliedIds] = await Promise.all([
        getRecurringTemplates(),
        getAppliedRecurringIds(month),
      ]);
      return { all, appliedIds };
    },
  });

  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);

  // Sync pendingItems from query result; local edits to amounts must not be
  // overwritten on background refetches, so we only re-seed when the set of
  // pending IDs actually changes.
  useEffect(() => {
    if (!query.data) return;
    const { all, appliedIds } = query.data;
    const pendingTemplates = all.filter((r) => !appliedIds.has(r.id));
    setPendingItems((prev) => {
      const prevIds = prev.map((p) => p.recurring.id).join(",");
      const nextIds = pendingTemplates.map((r) => r.id).join(",");
      if (prevIds === nextIds) return prev;
      return pendingTemplates.map((r) => ({
        recurring: r,
        editAmount: String(r.amount),
      }));
    });
  }, [query.data]);

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    templates: query.data?.all ?? [],
    pendingItems,
    setPendingItems,
    loading: query.isPending,
    error: query.error ? (query.error as Error).message : null,
    refresh,
  };
}
