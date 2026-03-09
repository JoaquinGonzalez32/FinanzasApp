import type { Transaction } from "../../../types/database";
import type {
  PeriodComparison,
  PeriodDef,
  PeriodTotals,
  CategoryComparison,
} from "../models/types";
import { percentChange, savingsRate } from "../utils/math";
import { getCategoryStyle, formatCurrency, MONTHS_ES } from "../../../lib/helpers";

/** Compare two sets of transactions for two arbitrary periods. */
export function comparePeriods(
  periodA: PeriodDef,
  transactionsA: Transaction[],
  periodB: PeriodDef,
  transactionsB: Transaction[],
  currency?: string,
): PeriodComparison {
  const totalsA = computeTotals(transactionsA);
  const totalsB = computeTotals(transactionsB);

  const difference: PeriodTotals = {
    income: totalsB.income - totalsA.income,
    expense: totalsB.expense - totalsA.expense,
    net: totalsB.net - totalsA.net,
    savingsRate: totalsB.savingsRate - totalsA.savingsRate,
  };

  const pctChange: PeriodTotals = {
    income: percentChange(totalsA.income, totalsB.income),
    expense: percentChange(totalsA.expense, totalsB.expense),
    net: percentChange(Math.abs(totalsA.net), Math.abs(totalsB.net)) * (totalsB.net >= totalsA.net ? 1 : -1),
    savingsRate: totalsA.savingsRate === 0 ? 0 : percentChange(totalsA.savingsRate, totalsB.savingsRate),
  };

  const categoryComparison = compareCategoryBreakdowns(transactionsA, transactionsB);

  const summary = generateSummary(
    periodA,
    periodB,
    totalsA,
    totalsB,
    pctChange,
    categoryComparison,
    currency,
  );

  return {
    periodA,
    periodB,
    totalsA,
    totalsB,
    difference,
    percentChange: pctChange,
    categoryComparison,
    summary,
  };
}

/** Build period definition for a month string. */
export function monthToPeriod(month: string): PeriodDef {
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const monthName = MONTHS_ES[m - 1];
  return {
    label: `${monthName} ${y}`,
    start: `${month}-01`,
    end: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

function computeTotals(transactions: Transaction[]): PeriodTotals {
  let income = 0;
  let expense = 0;
  for (const tx of transactions) {
    if (tx.type === "income") income += Number(tx.amount);
    else expense += Number(tx.amount);
  }
  return {
    income,
    expense,
    net: income - expense,
    savingsRate: savingsRate(income, expense),
  };
}

function compareCategoryBreakdowns(
  txA: Transaction[],
  txB: Transaction[],
): CategoryComparison[] {
  const mapA = groupByCategory(txA);
  const mapB = groupByCategory(txB);

  const allIds = new Set([...mapA.keys(), ...mapB.keys()]);
  const results: CategoryComparison[] = [];

  for (const id of allIds) {
    const a = mapA.get(id);
    const b = mapB.get(id);
    const amountA = a?.amount ?? 0;
    const amountB = b?.amount ?? 0;
    const meta = a ?? b;

    results.push({
      categoryId: id,
      categoryName: meta!.name,
      categoryIcon: meta!.icon,
      categoryColor: meta!.color,
      amountA,
      amountB,
      difference: amountB - amountA,
      percentChange: percentChange(amountA, amountB),
      isNewInA: !b && !!a,
      isNewInB: !a && !!b,
    });
  }

  return results.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
}

function groupByCategory(
  txs: Transaction[],
): Map<string, { amount: number; name: string; icon: string; color: string }> {
  const map = new Map<string, { amount: number; name: string; icon: string; color: string }>();
  for (const tx of txs) {
    if (!tx.category || tx.type !== "expense") continue;
    const key = tx.category.id;
    const existing = map.get(key);
    if (existing) {
      existing.amount += Number(tx.amount);
    } else {
      map.set(key, {
        amount: Number(tx.amount),
        name: tx.category.name,
        icon: tx.category.icon,
        color: tx.category.color,
      });
    }
  }
  return map;
}

function generateSummary(
  periodA: PeriodDef,
  periodB: PeriodDef,
  totalsA: PeriodTotals,
  totalsB: PeriodTotals,
  pctChange: PeriodTotals,
  categories: CategoryComparison[],
  currency?: string,
): string {
  const parts: string[] = [];
  const fmt = (n: number) => formatCurrency(Math.abs(n), currency);

  // Overall expense change
  if (Math.abs(pctChange.expense) >= 1) {
    const dir = pctChange.expense > 0 ? "mas" : "menos";
    parts.push(
      `En ${periodB.label} gastaste ${Math.abs(Math.round(pctChange.expense))}% ${dir} que en ${periodA.label}`,
    );
  } else {
    parts.push(
      `Tu gasto se mantuvo estable entre ${periodA.label} y ${periodB.label}`,
    );
  }

  // Top increases and decreases
  const increases = categories.filter((c) => c.difference > 0).slice(0, 2);
  const decreases = categories.filter((c) => c.difference < 0).slice(0, 2);

  if (increases.length > 0) {
    const inc = increases
      .map((c) => `${fmt(c.difference)} en ${c.categoryName}`)
      .join(" y ");
    parts.push(`principalmente por un aumento de ${inc}`);
  }

  if (decreases.length > 0) {
    const dec = decreases
      .map((c) => `${c.categoryName} en un ${Math.abs(Math.round(c.percentChange))}%`)
      .join(" y ");
    parts.push(`Redujiste ${dec}`);
  }

  return parts.join(", ") + ".";
}
