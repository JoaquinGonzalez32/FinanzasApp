import { useMemo } from "react";
import { useAccountContext } from "../context/AccountContext";
import type { Transaction, BudgetItem, Category } from "../types/database";

/**
 * Resolves the account_id for a transaction, considering the category fallback.
 */
function txAccountId(tx: Transaction): string | null {
  return tx.account_id ?? tx.category?.account_id ?? null;
}

/**
 * Filter transactions by the globally selected account.
 * Returns all when "Todas" is selected.
 */
export function useFilteredTransactions(transactions: Transaction[]) {
  const { selectedAccountId } = useAccountContext();
  return useMemo(() => {
    if (!selectedAccountId) return transactions;
    return transactions.filter((tx) => txAccountId(tx) === selectedAccountId);
  }, [transactions, selectedAccountId]);
}

/**
 * Filter budget items by the globally selected account.
 */
export function useFilteredBudgetItems(budgetItems: BudgetItem[]) {
  const { selectedAccountId } = useAccountContext();
  return useMemo(() => {
    if (!selectedAccountId) return budgetItems;
    return budgetItems.filter(
      (bi) => !bi.account_id || bi.account_id === selectedAccountId,
    );
  }, [budgetItems, selectedAccountId]);
}

/**
 * Filter categories by the globally selected account.
 */
export function useFilteredCategories(categories: Category[]) {
  const { selectedAccountId } = useAccountContext();
  return useMemo(() => {
    if (!selectedAccountId) return categories;
    return categories.filter(
      (c) => !c.account_id || c.account_id === selectedAccountId,
    );
  }, [categories, selectedAccountId]);
}

/**
 * Group amounts by currency from a list of transactions + account map.
 * Useful for "Todas" mode where currencies may be mixed.
 */
export function useCurrencyTotals(
  transactions: Transaction[],
  accountMap: Record<string, { currency: string }>,
  type: "expense" | "income",
) {
  return useMemo(() => {
    const totals: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.type !== type) continue;
      const accId = txAccountId(tx);
      const currency = accId ? accountMap[accId]?.currency ?? "UYU" : "UYU";
      totals[currency] = (totals[currency] || 0) + Number(tx.amount);
    }
    return totals;
  }, [transactions, accountMap, type]);
}
