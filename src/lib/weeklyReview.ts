import type { Transaction, Category } from '../types/database';
import { parseMonth } from './helpers';

export type ReviewStatus =
  | 'en_ritmo'
  | 'en_riesgo'
  | 'critica'
  | 'no_evaluable'
  | 'sin_datos';

/** Slim input — built from local planning state so edits are reflected immediately */
export interface ReviewInput {
  categoryId: string;
  category: Category | null | undefined;
  plannedAmount: number;
}

export interface CategoryReview {
  category: Category;
  categoryId: string;
  /** Planned budget (P) */
  planned: number;
  /** Actual spend so far (S) */
  spent: number;
  /** Number of expense transactions for this category this month */
  txCount: number;
  /** dailyAvg * D — estimated spend by end of month */
  projection: number;
  /** projection - planned (negative = under budget) */
  difference: number;
  daysElapsed: number;
  daysInMonth: number;
  status: ReviewStatus;
}

export interface WeeklyReviewSummary {
  items: CategoryReview[];
  enRitmoCount: number;
  enRiesgoCount: number;
  criticaCount: number;
  noEvaluableCount: number;
}

// ─── Pure date helpers ────────────────────────────────────────────────────────

/** Total days in a month. month is 1-indexed. */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Days elapsed in the given month up to (and including) today.
 * - Current month → today.getDate()
 * - Past month    → full month length
 * - Future month  → 0
 */
export function getDaysElapsed(year: number, month: number): number {
  const today = new Date();
  const ty = today.getFullYear();
  const tm = today.getMonth() + 1;

  if (year === ty && month === tm) return today.getDate();

  // Compare first-of-month to first-of-current-month (no time-zone issues)
  const firstOfTarget = new Date(year, month - 1, 1);
  const firstOfCurrent = new Date(ty, tm - 1, 1);
  if (firstOfTarget < firstOfCurrent) return getDaysInMonth(year, month); // past
  return 0; // future
}

// ─── Core calculation ─────────────────────────────────────────────────────────

const STATUS_ORDER: Record<ReviewStatus, number> = {
  critica: 0,
  en_riesgo: 1,
  en_ritmo: 2,
  no_evaluable: 3,
  sin_datos: 4,
};

/**
 * Pure function — no side effects, no DB calls.
 *
 * @param planItems        Budget items already filtered by account (visibleItems in planning.js)
 * @param transactions     All transactions for the month (unfiltered by type/account)
 * @param month            "YYYY-MM"
 * @param selectedAccountId Active account filter (null = all accounts)
 */
export function computeWeeklyReview(
  planItems: ReviewInput[],
  transactions: Transaction[],
  month: string,
  selectedAccountId: string | null,
): WeeklyReviewSummary {
  const { year, month: m } = parseMonth(month);
  const D = getDaysInMonth(year, m);
  const d = getDaysElapsed(year, m);

  // Filter to expense transactions for the selected account — single pass
  const expenseTxs = transactions.filter((tx) => {
    if (tx.type !== 'expense') return false;
    if (!selectedAccountId) return true;
    const txAcc = tx.account_id ?? tx.category?.account_id;
    return txAcc === selectedAccountId;
  });

  // Build spend map: category_id → { total, count }  (avoids N+1)
  const spendMap = new Map<string, { total: number; count: number }>();
  for (const tx of expenseTxs) {
    if (!tx.category_id) continue;
    const prev = spendMap.get(tx.category_id) ?? { total: 0, count: 0 };
    spendMap.set(tx.category_id, {
      total: prev.total + Number(tx.amount),
      count: prev.count + 1,
    });
  }

  const items: CategoryReview[] = [];

  for (const planItem of planItems) {
    const P = planItem.plannedAmount;
    // Skip categories with no planned budget or missing category metadata
    if (P <= 0 || !planItem.category) continue;

    const { total: S = 0, count: txCount = 0 } =
      spendMap.get(planItem.categoryId) ?? {};

    let status: ReviewStatus;
    let projection = 0;
    let difference = 0;

    if (d === 0 || txCount === 0) {
      // Future month or no spending yet
      status = 'sin_datos';
    } else if (txCount === 1) {
      // Single transaction (e.g. rent on day 1) → avoid false positive
      status = 'no_evaluable';
      projection = (S / d) * D;
      difference = projection - P;
    } else {
      projection = (S / d) * D;
      difference = projection - P;

      if (projection <= P) {
        status = 'en_ritmo';
      } else if (projection <= P * 1.1) {
        status = 'en_riesgo';
      } else {
        status = 'critica';
      }
    }

    items.push({
      category: planItem.category,
      categoryId: planItem.categoryId,
      planned: P,
      spent: S,
      txCount,
      projection,
      difference,
      daysElapsed: d,
      daysInMonth: D,
      status,
    });
  }

  // Sort: critical first, then at-risk, on-track, unevaluable, no-data
  items.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);

  return {
    items,
    enRitmoCount: items.filter((i) => i.status === 'en_ritmo').length,
    enRiesgoCount: items.filter((i) => i.status === 'en_riesgo').length,
    criticaCount: items.filter((i) => i.status === 'critica').length,
    noEvaluableCount: items.filter((i) => i.status === 'no_evaluable').length,
  };
}
