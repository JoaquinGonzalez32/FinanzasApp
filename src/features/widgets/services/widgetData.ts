import { getMonthTransactions, getTodayTransactions } from "../../../services/transactionsService";
import { getBudgetItems } from "../../../services/budgetService";
import { getCategories } from "../../../services/categoriesService";
import { getAccounts } from "../../../services/accountsService";
import { getCurrentMonth, sumByType, groupByCategory } from "../../../lib/helpers";
import type { Transaction, Category, Account, BudgetItem } from "../../../types/database";
import type {
  WidgetData,
  WidgetCategorySummary,
  WidgetCategoryQuick,
  WidgetLastTransaction,
  WidgetConfig,
} from "../types/widget.types";
import { DEFAULT_WIDGET_CONFIG } from "../types/widget.types";
import { loadWidgetConfig } from "./widgetConfig";

/**
 * Build the complete WidgetData payload from app state.
 * Fetches fresh data from Supabase — call this after transactions/budget changes.
 */
export async function buildWidgetData(): Promise<WidgetData> {
  const config = await loadWidgetConfig();
  const month = getCurrentMonth();
  const now = new Date();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = lastDayOfMonth - now.getDate();

  // Parallel fetches
  const [monthTxs, todayTxs, budgetItems, categories, accounts] = await Promise.all([
    getMonthTransactions(),
    getTodayTransactions(),
    getBudgetItems(month),
    getCategories("expense"),
    getAccounts(),
  ]);

  const monthlySpent = sumByType(monthTxs, "expense");
  const monthlyIncome = sumByType(monthTxs, "income");
  const dailySpent = sumByType(todayTxs, "expense");
  const monthlyBudget = budgetItems.reduce((sum, b) => sum + Number(b.percentage), 0);

  const topCategories = buildTopCategories(monthTxs, budgetItems);
  const frequentCategories = buildFrequentCategories(monthTxs, categories, config);
  const lastTransaction = buildLastTransaction(monthTxs);

  const defaultAccountId = resolveDefaultAccount(config, accounts);
  const currency = config.currency ?? DEFAULT_WIDGET_CONFIG.currency;

  return {
    monthlyBudget,
    monthlySpent,
    dailySpent,
    daysRemaining,
    monthlyIncome,
    topCategories,
    frequentCategories,
    lastTransaction,
    defaultAccountId,
    currency,
    updatedAt: new Date().toISOString(),
  };
}

/** Top 3 categories by budget amount, with their spending */
function buildTopCategories(
  transactions: Transaction[],
  budgetItems: BudgetItem[]
): WidgetCategorySummary[] {
  const grouped = groupByCategory(transactions.filter((t) => t.type === "expense"));
  const spentMap = new Map(grouped.map((g) => [g.category.id, g.total]));

  return budgetItems
    .filter((b) => b.category)
    .sort((a, b) => Number(b.percentage) - Number(a.percentage))
    .slice(0, 3)
    .map((b) => ({
      id: b.category_id,
      name: b.category!.name,
      icon: b.category!.icon,
      color: b.category!.color,
      spent: spentMap.get(b.category_id) ?? 0,
      budget: Number(b.percentage),
    }));
}

/** 5 most-used expense categories (or user-pinned ones) */
function buildFrequentCategories(
  transactions: Transaction[],
  categories: Category[],
  config: WidgetConfig
): WidgetCategoryQuick[] {
  // If user pinned specific categories, use those
  if (config.fixedCategoryIds.length > 0) {
    const catMap = new Map(categories.map((c) => [c.id, c]));
    return config.fixedCategoryIds
      .map((id) => catMap.get(id))
      .filter((c): c is Category => !!c)
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        accountId: c.account_id,
      }));
  }

  // Otherwise, calculate by frequency from last 30 days of expenses
  const expenses = transactions.filter((t) => t.type === "expense" && t.category);
  const freq = new Map<string, { count: number; category: Category }>();
  for (const tx of expenses) {
    const cat = tx.category!;
    const entry = freq.get(cat.id);
    if (entry) {
      entry.count++;
    } else {
      freq.set(cat.id, { count: 1, category: cat });
    }
  }

  return Array.from(freq.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((e) => ({
      id: e.category.id,
      name: e.category.name,
      icon: e.category.icon,
      color: e.category.color,
      accountId: e.category.account_id,
    }));
}

/** Most recent transaction */
function buildLastTransaction(transactions: Transaction[]): WidgetLastTransaction | null {
  if (transactions.length === 0) return null;
  const tx = transactions[0]; // Already sorted by date desc, created_at desc
  return {
    categoryName: tx.category?.name ?? "Sin categoria",
    categoryIcon: tx.category?.icon ?? "help-outline",
    amount: Number(tx.amount),
    description: tx.note,
    time: tx.created_at,
    type: tx.type,
  };
}

/** Pick account: user config > most-used account > first account */
function resolveDefaultAccount(config: WidgetConfig, accounts: Account[]): string | null {
  if (config.defaultAccountId) {
    const exists = accounts.find((a) => a.id === config.defaultAccountId);
    if (exists) return exists.id;
  }
  return accounts.length > 0 ? accounts[0].id : null;
}
