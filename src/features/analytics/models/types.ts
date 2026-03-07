import type { Transaction, Category, BudgetItem, Account, AccountCurrency } from "../../../types/database";

// ── Monthly Summary ────────────────────────────────────────────

export interface CategoryMonthSummary {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  type: "expense" | "income";
  amount: number;
  count: number;
  budgetAmount: number | null;
  budgetUsage: number | null;
}

export interface AccountMonthSummary {
  accountId: string;
  accountName: string;
  currency: AccountCurrency;
  income: number;
  expense: number;
  net: number;
}

export interface MonthlySummary {
  month: string; // "YYYY-MM"
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  savingsRate: number; // 0-100
  byCategory: CategoryMonthSummary[];
  byAccount: AccountMonthSummary[];
  transactionCount: number;
}

// ── Trends ─────────────────────────────────────────────────────

export type TrendDirection = "up" | "down" | "stable";

export interface MonthAmount {
  month: string;
  amount: number;
}

export interface CategoryTrend {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  monthlyAmounts: MonthAmount[];
  movingAverage: number[];
  direction: TrendDirection;
  consecutiveMonths: number;
  percentChange: number;
  avgAmount: number;
}

export interface GlobalTrend {
  monthlyExpenses: MonthAmount[];
  monthlyIncome: MonthAmount[];
  monthlySavingsRate: { month: string; rate: number }[];
  expenseDirection: TrendDirection;
  incomeDirection: TrendDirection;
  savingsDirection: TrendDirection;
}

// ── Period Comparison ──────────────────────────────────────────

export interface PeriodDef {
  label: string;
  start: string; // "YYYY-MM-DD"
  end: string;
}

export interface PeriodTotals {
  income: number;
  expense: number;
  net: number;
  savingsRate: number;
}

export interface CategoryComparison {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  amountA: number;
  amountB: number;
  difference: number;
  percentChange: number;
  isNewInA: boolean;
  isNewInB: boolean;
}

export interface PeriodComparison {
  periodA: PeriodDef;
  periodB: PeriodDef;
  totalsA: PeriodTotals;
  totalsB: PeriodTotals;
  difference: PeriodTotals;
  percentChange: PeriodTotals;
  categoryComparison: CategoryComparison[];
  summary: string;
}

// ── Insights / Alerts ──────────────────────────────────────────

export type InsightType =
  | "trend_rising"
  | "trend_falling"
  | "spike"
  | "over_budget"
  | "savings_improved"
  | "savings_declined"
  | "general";

export type InsightSeverity = "info" | "warning" | "critical";
export type InsightStatus = "new" | "seen" | "dismissed";

export interface Insight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  status: InsightStatus;
  categoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  message: string;
  detail?: string;
  data?: Record<string, unknown>;
  createdAt: string;
}

// ── Chart Data ─────────────────────────────────────────────────

export type TimeRange = "3M" | "6M" | "12M" | "ALL";

export interface EvolutionDataPoint {
  month: string;
  label: string; // "Ene", "Feb", etc.
  income: number;
  expense: number;
  net: number;
}

export interface PieSlice {
  label: string;
  amount: number;
  percentage: number;
  color: string;
  icon?: string;
  focused?: boolean;
}
