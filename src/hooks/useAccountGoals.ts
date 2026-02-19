import { useState, useEffect, useCallback } from "react";
import type { AccountGoal } from "../types/database";
import * as svc from "../services/accountGoalsService";
import { onAccountGoalsChange } from "../lib/events";

interface UseAccountGoalsResult {
  goals: AccountGoal[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAccountGoals(accountId: string | null): UseAccountGoalsResult {
  const [goals, setGoals] = useState<AccountGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!accountId) {
      setGoals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await svc.getAccountGoals(accountId);
      setGoals(data);
    } catch (e: any) {
      setError(e.message ?? "Error loading goals");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    return onAccountGoalsChange(() => {
      fetch();
    });
  }, [fetch]);

  return { goals, loading, error, refresh: fetch };
}
