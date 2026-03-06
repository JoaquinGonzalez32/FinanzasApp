import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBudget } from './useBudget';
import { computeWeeklyReview } from '../lib/weeklyReview';
import type { WeeklyReviewSummary } from '../lib/weeklyReview';
import { getCurrentMonth, toDateISO } from '../lib/helpers';
import type { Transaction } from '../types/database';

const STORAGE_KEY = 'weeklyReview_lastShown';

function isMondayToday(): boolean {
  return new Date().getDay() === 1;
}

export interface WeeklyAlertState {
  visible: boolean;
  summary: WeeklyReviewSummary | null;
  dismiss: () => void;
}

/**
 * Shows an in-app alert on Mondays when at-risk or critical categories are detected.
 * Uses AsyncStorage to avoid repeating the alert more than once per Monday.
 *
 * @param transactions        Month transactions already fetched by the calling screen
 * @param transactionsLoading Whether those transactions are still loading
 */
export function useWeeklyReviewAlert(
  transactions: Transaction[],
  transactionsLoading: boolean,
): WeeklyAlertState {
  const currentMonth = getCurrentMonth();
  const { budgetItems, loading: budgetLoading } = useBudget(currentMonth);
  const [visible, setVisible] = useState(false);
  const [summary, setSummary] = useState<WeeklyReviewSummary | null>(null);
  // Prevent re-checking on re-renders after the initial check completes
  const hasChecked = useRef(false);

  // Only run once both data sources are ready
  const isReady = !transactionsLoading && !budgetLoading;

  useEffect(() => {
    if (!isReady || hasChecked.current) return;

    if (!isMondayToday()) { hasChecked.current = true; return; }
    if (budgetItems.length === 0) return;

    hasChecked.current = true;

    AsyncStorage.getItem(STORAGE_KEY).then((lastShown) => {
      // Already shown this Monday
      if (lastShown === toDateISO()) return;

      const inputs = budgetItems
        .filter((b) => b.category && Number(b.percentage) > 0)
        .map((b) => ({
          categoryId: b.category_id,
          category: b.category!,
          plannedAmount: Number(b.percentage),
        }));

      // Global view (null account) — banner is cross-account summary
      const result = computeWeeklyReview(inputs, transactions, currentMonth, null);

      if (result.enRiesgoCount > 0 || result.criticaCount > 0) {
        setSummary(result);
        setVisible(true);
      }
    });
  // isReady captures both loading states; budgetItems/transactions are closured correctly
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  const dismiss = useCallback(() => {
    setVisible(false);
    AsyncStorage.setItem(STORAGE_KEY, toDateISO());
  }, []);

  return { visible, summary, dismiss };
}
