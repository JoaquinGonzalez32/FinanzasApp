import type { AccountCurrency } from "../../../types/database";

/** Lightweight data model shared between RN and native widgets */
export interface WidgetData {
  /** Total budget assigned for the current month */
  monthlyBudget: number;
  /** Total spent this month */
  monthlySpent: number;
  /** Total spent today */
  dailySpent: number;
  /** Calendar days remaining in the month */
  daysRemaining: number;
  /** Monthly income (for pace calculation) */
  monthlyIncome: number;
  /** Top categories by budget with spending progress */
  topCategories: WidgetCategorySummary[];
  /** Most-used categories for quick-add (up to 5) */
  frequentCategories: WidgetCategoryQuick[];
  /** Last recorded transaction */
  lastTransaction: WidgetLastTransaction | null;
  /** Default account for quick-add */
  defaultAccountId: string | null;
  /** Currency symbol to display */
  currency: AccountCurrency;
  /** ISO timestamp of last update */
  updatedAt: string;
}

export interface WidgetCategorySummary {
  id: string;
  name: string;
  icon: string;
  color: string;
  spent: number;
  budget: number;
}

export interface WidgetCategoryQuick {
  id: string;
  name: string;
  icon: string;
  color: string;
  accountId: string | null;
}

export interface WidgetLastTransaction {
  categoryName: string;
  categoryIcon: string;
  amount: number;
  description: string | null;
  time: string; // ISO timestamp
  type: "expense" | "income";
}

/** User preferences for widget behavior */
export interface WidgetConfig {
  /** Override default account for quick-add */
  defaultAccountId: string | null;
  /** Fixed categories for quick-add (overrides frequency-based) */
  fixedCategoryIds: string[];
  /** Currency to display in summary widget */
  currency: AccountCurrency;
}

export const DEFAULT_WIDGET_CONFIG: WidgetConfig = {
  defaultAccountId: null,
  fixedCategoryIds: [],
  currency: "UYU",
};
