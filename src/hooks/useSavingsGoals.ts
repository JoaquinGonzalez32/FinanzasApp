import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SavingsGoal, GoalContribution } from "../types/database";
import * as svc from "../services/savingsGoalsService";
import { qk } from "../lib/queryClient";

interface UseSavingsGoalsResult {
  goals: SavingsGoal[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSavingsGoals(
  accountId?: string | null,
  mode?: "active" | "all"
): UseSavingsGoalsResult {
  const query = useQuery({
    queryKey: qk.savingsGoals(accountId, mode),
    queryFn: async () => {
      if (accountId) return svc.getGoalsByAccount(accountId);
      if (mode === "all") return svc.getAllGoals();
      return svc.getAllActiveGoals();
    },
  });

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    goals: query.data ?? [],
    loading: query.isPending,
    error: query.error ? (query.error as Error).message : null,
    refresh,
  };
}

interface UseGoalContributionsResult {
  contributions: GoalContribution[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useGoalContributions(goalId: string | null): UseGoalContributionsResult {
  const query = useQuery({
    queryKey: qk.goalContributions(goalId),
    queryFn: () => svc.getContributions(goalId!),
    enabled: !!goalId,
  });

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    contributions: query.data ?? [],
    loading: goalId ? query.isPending : false,
    error: query.error ? (query.error as Error).message : null,
    refresh,
  };
}
