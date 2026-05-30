/**
 * Pure cache-patch helpers for optimistic transaction mutations.
 *
 * The transaction list queries (`getMonthTransactions`, `getYearTransactions`,
 * `getTransactionsByDate`) all order by `date DESC, created_at DESC`. These
 * helpers replicate that ordering so an optimistically-inserted row lands in
 * the same slot the server would put it — no visible reshuffle when the
 * background refetch reconciles.
 *
 * Both functions are pure: they never mutate their input array.
 */
import type { Transaction } from "../types/database";

/**
 * True when `a` should sort before `b` under (date DESC, created_at DESC).
 * `date` (YYYY-MM-DD) and `created_at` (ISO-8601) compare chronologically as
 * plain strings, so no Date parsing is required.
 */
function sortsBefore(a: Transaction, b: Transaction): boolean {
  if (a.date !== b.date) return a.date > b.date;
  return (a.created_at ?? "") > (b.created_at ?? "");
}

/**
 * Insert `tx` into `rows` keeping (date DESC, created_at DESC) order. If a row
 * with the same id already exists it is replaced in place (upsert), so the
 * helper is safe to call for both creates and edits.
 */
export function insertTransactionSorted(
  rows: Transaction[] | undefined,
  tx: Transaction
): Transaction[] {
  const without = (rows ?? []).filter((r) => r.id !== tx.id);
  const index = without.findIndex((r) => sortsBefore(tx, r));
  if (index === -1) return [...without, tx];
  return [...without.slice(0, index), tx, ...without.slice(index)];
}

/** Remove the row with `id`, preserving the order of the rest. */
export function removeTransactionById(
  rows: Transaction[] | undefined,
  id: string
): Transaction[] {
  return (rows ?? []).filter((r) => r.id !== id);
}

/**
 * The budget month (YYYY-MM) an income counts toward: its explicit
 * `budget_month`, or — when unset — the month of its `date`. Mirrors the
 * server rule in `getBudgetMonthIncome`.
 */
export function budgetMonthOf(
  tx: Pick<Transaction, "budget_month" | "date">
): string {
  return tx.budget_month ?? tx.date.slice(0, 7);
}

/** Whether `tx` should appear in the budget-income list for `month`. */
export function incomeBelongsToBudgetMonth(
  tx: Pick<Transaction, "type" | "budget_month" | "date">,
  month: string
): boolean {
  return tx.type === "income" && budgetMonthOf(tx) === month;
}
