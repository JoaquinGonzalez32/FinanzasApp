import { useState, useEffect, useMemo, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SavingsGoal } from "../../../types/database";
import type { Insight } from "../../analytics/models/types";
import { getCurrentMonth } from "../../../lib/helpers";
import {
  type HomeBanner,
  buildBudgetBanners,
  buildGoalBanners,
  buildInsightBanners,
  buildPendingRecurringBanner,
  prioritizeBanners,
} from "../services/bannerRules";

const DISMISSED_KEY = "home_banners_dismissed";
const MAX_BANNERS = 2;

interface CategoryAlert {
  name: string;
  icon: string;
  spent: number;
  planned: number;
  pct: number;
  remaining: number;
}

interface UseHomeBannersInput {
  categoryAlerts: CategoryAlert[];
  goals: SavingsGoal[];
  insights: Insight[];
  pendingRecurringCount: number;
  currency?: string;
  accountMap?: Record<string, { name: string }>;
}

interface UseHomeBannersResult {
  banners: HomeBanner[];
  dismiss: (id: string) => void;
}

export function useHomeBanners({
  categoryAlerts,
  goals,
  insights,
  pendingRecurringCount,
  currency,
  accountMap,
}: UseHomeBannersInput): UseHomeBannersResult {
  const [dismissedIds, setDismissedIds] = useState<Record<string, string>>({});
  const month = useMemo(() => getCurrentMonth(), []);

  // Load dismissed state
  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY).then((raw) => {
      if (!raw) return;
      try {
        const stored = JSON.parse(raw);
        // Reset if month changed
        if (stored._month !== month) {
          AsyncStorage.removeItem(DISMISSED_KEY);
          return;
        }
        setDismissedIds(stored);
      } catch {
        AsyncStorage.removeItem(DISMISSED_KEY);
      }
    });
  }, [month]);

  const dismiss = useCallback(
    (id: string) => {
      setDismissedIds((prev) => {
        const next = { ...prev, [id]: month, _month: month };
        AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
        return next;
      });
    },
    [month],
  );

  const banners = useMemo(() => {
    const all: HomeBanner[] = [
      ...buildBudgetBanners(categoryAlerts, currency),
      ...buildGoalBanners(goals, currency, accountMap),
      ...buildInsightBanners(insights),
    ];

    const recurringBanner = buildPendingRecurringBanner(pendingRecurringCount);
    if (recurringBanner) all.push(recurringBanner);

    const undismissed = all.filter((b) => !dismissedIds[b.id]);
    return prioritizeBanners(undismissed, MAX_BANNERS);
  }, [categoryAlerts, goals, insights, pendingRecurringCount, currency, accountMap, dismissedIds]);

  return { banners, dismiss };
}
