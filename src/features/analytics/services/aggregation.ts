import type { Transaction, BudgetItem, Account } from "../../../types/database";
import type {
  MonthlySummary,
  CategoryMonthSummary,
  AccountMonthSummary,
  EvolutionDataPoint,
  PieSlice,
} from "../models/types";
import { savingsRate, shortMonthLabel } from "../utils/math";
import { getCategoryStyle } from "../../../lib/helpers";

/** Build a MonthlySummary from raw transactions + budget items for one month. */
export function buildMonthlySummary(
  month: string,
  transactions: Transaction[],
  budgetItems: BudgetItem[],
  accounts: Account[],
): MonthlySummary {
  const totalIncome = sumType(transactions, "income");
  const totalExpense = sumType(transactions, "expense");

  const budgetMap = new Map<string, number>();
  for (const b of budgetItems) {
    budgetMap.set(b.category_id, Number(b.percentage) || 0);
  }

  const catMap = new Map<string, CategoryMonthSummary>();
  for (const tx of transactions) {
    if (!tx.category) continue;
    const key = tx.category.id;
    const existing = catMap.get(key);
    if (existing) {
      existing.amount += Number(tx.amount);
      existing.count++;
    } else {
      const budget = budgetMap.get(key) ?? null;
      catMap.set(key, {
        categoryId: key,
        categoryName: tx.category.name,
        categoryIcon: tx.category.icon,
        categoryColor: tx.category.color,
        type: tx.category.type,
        amount: Number(tx.amount),
        count: 1,
        budgetAmount: budget,
        budgetUsage: null,
      });
    }
  }
  for (const cs of catMap.values()) {
    if (cs.budgetAmount && cs.budgetAmount > 0) {
      cs.budgetUsage = (cs.amount / cs.budgetAmount) * 100;
    }
  }

  const accMap = new Map<string, AccountMonthSummary>();
  const accountLookup = new Map(accounts.map((a) => [a.id, a]));
  for (const tx of transactions) {
    const accId = tx.account_id ?? tx.category?.account_id;
    if (!accId) continue;
    const acc = accountLookup.get(accId);
    const existing = accMap.get(accId);
    if (existing) {
      if (tx.type === "income") existing.income += Number(tx.amount);
      else existing.expense += Number(tx.amount);
      existing.net = existing.income - existing.expense;
    } else {
      const inc = tx.type === "income" ? Number(tx.amount) : 0;
      const exp = tx.type === "expense" ? Number(tx.amount) : 0;
      accMap.set(accId, {
        accountId: accId,
        accountName: acc?.name ?? "Cuenta",
        currency: acc?.currency ?? "UYU",
        income: inc,
        expense: exp,
        net: inc - exp,
      });
    }
  }

  return {
    month,
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    savingsRate: savingsRate(totalIncome, totalExpense),
    byCategory: Array.from(catMap.values()).sort((a, b) => b.amount - a.amount),
    byAccount: Array.from(accMap.values()),
    transactionCount: transactions.length,
  };
}

/** Build evolution data points from an array of MonthlySummary. */
export function buildEvolutionData(summaries: MonthlySummary[]): EvolutionDataPoint[] {
  return summaries.map((s) => ({
    month: s.month,
    label: shortMonthLabel(s.month),
    income: s.totalIncome,
    expense: s.totalExpense,
    net: s.netBalance,
  }));
}

/** Build donut/pie slices from expense categories in a MonthlySummary. */
export function buildDistributionSlices(summary: MonthlySummary): PieSlice[] {
  const expenseCats = summary.byCategory.filter((c) => c.type === "expense");
  const total = expenseCats.reduce((s, c) => s + c.amount, 0);
  if (total <= 0) return [];

  return expenseCats.map((c) => ({
    label: c.categoryName,
    amount: c.amount,
    percentage: (c.amount / total) * 100,
    color: getCategoryStyle(c.categoryColor).hex,
    icon: c.categoryIcon,
  }));
}

/** Group transactions by month key "YYYY-MM". */
export function groupTransactionsByMonth(
  transactions: Transaction[],
): Map<string, Transaction[]> {
  const map = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const month = tx.date.substring(0, 7); // "YYYY-MM"
    const arr = map.get(month);
    if (arr) arr.push(tx);
    else map.set(month, [tx]);
  }
  return map;
}

/** Build multiple MonthlySummary from a flat list of transactions across months. */
export function buildMultiMonthSummaries(
  transactions: Transaction[],
  budgetItemsByMonth: Map<string, BudgetItem[]>,
  accounts: Account[],
  months: string[],
): MonthlySummary[] {
  const txByMonth = groupTransactionsByMonth(transactions);
  return months.map((m) =>
    buildMonthlySummary(
      m,
      txByMonth.get(m) ?? [],
      budgetItemsByMonth.get(m) ?? [],
      accounts,
    ),
  );
}

function sumType(txs: Transaction[], type: "income" | "expense"): number {
  return txs
    .filter((t) => t.type === type)
    .reduce((s, t) => s + Number(t.amount), 0);
}
