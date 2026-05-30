import { useCallback, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { RecurringTemplate } from "../types/database";
import { getRecurringTemplates } from "../services/recurringService";
import { getNextOccurrence } from "../lib/recurringSchedule";
import { qk } from "../lib/queryClient";

export interface PendingItem {
  recurring: RecurringTemplate;
  /** Next occurrence date (YYYY-MM-DD) within the current month. */
  nextDate: string;
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

/** Is `iso` (YYYY-MM-DD) inside the same calendar month as `ref`? */
function isSameMonth(iso: string, ref: Date): boolean {
  const [y, m] = iso.split("-").map(Number);
  return y === ref.getFullYear() && m === ref.getMonth() + 1;
}

export function useRecurring(): UseRecurringResult {
  const query = useQuery({
    queryKey: qk.recurring,
    queryFn: getRecurringTemplates,
  });

  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);

  // "Pending / upcoming" = templates whose next occurrence falls within the
  // current month. Frequency-agnostic (monthly/weekly/biweekly/yearly all work
  // via getNextOccurrence). Local amount edits must survive background refetches,
  // so we only re-seed when the set of pending IDs actually changes.
  useEffect(() => {
    if (!query.data) return;
    const now = new Date();
    const upcoming = query.data
      .map((r) => ({ recurring: r, nextDate: getNextOccurrence(r, now) }))
      .filter((x): x is { recurring: RecurringTemplate; nextDate: string } =>
        x.nextDate != null && isSameMonth(x.nextDate, now)
      )
      .sort((a, b) => a.nextDate.localeCompare(b.nextDate));

    setPendingItems((prev) => {
      const prevIds = prev.map((p) => p.recurring.id).join(",");
      const nextIds = upcoming.map((u) => u.recurring.id).join(",");
      if (prevIds === nextIds) return prev;
      return upcoming.map((u) => ({
        recurring: u.recurring,
        nextDate: u.nextDate,
        editAmount: String(u.recurring.amount),
      }));
    });
  }, [query.data]);

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    templates: query.data ?? [],
    pendingItems,
    setPendingItems,
    loading: query.isPending,
    error: query.error ? (query.error as Error).message : null,
    refresh,
  };
}
