import { useState, useEffect, useCallback } from "react";
import type { SavingsGoal, GoalContribution } from "../types/database";
import * as svc from "../services/savingsGoalsService";
import { onSavingsGoalsChange } from "../lib/events";

interface UseSavingsGoalsResult {
  goals: SavingsGoal[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSavingsGoals(accountId?: string | null, mode?: "active" | "all"): UseSavingsGoalsResult {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data: SavingsGoal[];
      if (accountId) {
        data = await svc.getGoalsByAccount(accountId);
      } else if (mode === "all") {
        data = await svc.getAllGoals();
      } else {
        data = await svc.getAllActiveGoals();
      }
      setGoals(data);
    } catch (e: any) {
      setError(e.message ?? "Error loading goals");
    } finally {
      setLoading(false);
    }
  }, [accountId, mode]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    return onSavingsGoalsChange(() => {
      fetch();
    });
  }, [fetch]);

  return { goals, loading, error, refresh: fetch };
}

interface UseGoalContributionsResult {
  contributions: GoalContribution[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useGoalContributions(goalId: string | null): UseGoalContributionsResult {
  const [contributions, setContributions] = useState<GoalContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!goalId) {
      setContributions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await svc.getContributions(goalId);
      setContributions(data);
    } catch (e: any) {
      setError(e.message ?? "Error loading contributions");
    } finally {
      setLoading(false);
    }
  }, [goalId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    return onSavingsGoalsChange(() => {
      fetch();
    });
  }, [fetch]);

  return { contributions, loading, error, refresh: fetch };
}
