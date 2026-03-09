import { useState, useMemo, useCallback } from "react";
import type { MonthlySummary, Insight, InsightStatus } from "../models/types";
import { generateInsights, getTopInsight } from "../services/insights";

interface UseInsightsResult {
  insights: Insight[];
  topInsight: Insight | null;
  markAsSeen: (id: string) => void;
  dismiss: (id: string) => void;
  activeCount: number;
}

export function useInsights(
  summaries: MonthlySummary[],
  currency?: string,
): UseInsightsResult {
  const [statusOverrides, setStatusOverrides] = useState<Record<string, InsightStatus>>({});

  const rawInsights = useMemo(
    () => generateInsights(summaries, currency),
    [summaries, currency],
  );

  const insights = useMemo(
    () =>
      rawInsights.map((i) => ({
        ...i,
        status: statusOverrides[i.id] ?? i.status,
      })),
    [rawInsights, statusOverrides],
  );

  const markAsSeen = useCallback((id: string) => {
    setStatusOverrides((prev) => ({ ...prev, [id]: "seen" }));
  }, []);

  const dismiss = useCallback((id: string) => {
    setStatusOverrides((prev) => ({ ...prev, [id]: "dismissed" }));
  }, []);

  const activeInsights = insights.filter((i) => i.status !== "dismissed");
  const topInsight = getTopInsight(activeInsights);

  return {
    insights: activeInsights,
    topInsight,
    markAsSeen,
    dismiss,
    activeCount: activeInsights.length,
  };
}
