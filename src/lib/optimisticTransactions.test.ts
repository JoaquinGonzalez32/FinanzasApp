import { test } from "node:test";
import assert from "node:assert/strict";
import type { Transaction } from "../types/database";
import {
  insertTransactionSorted,
  removeTransactionById,
  budgetMonthOf,
  incomeBelongsToBudgetMonth,
} from "./optimisticTransactions.ts";

/** Build a transaction with sensible defaults; override per case. */
function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: "t1",
    user_id: "u1",
    amount: 100,
    type: "expense",
    category_id: "c1",
    account_id: "a1",
    note: null,
    date: "2026-05-15",
    created_at: "2026-05-15T10:00:00.000Z",
    ...overrides,
  };
}

const ids = (rows: Transaction[]) => rows.map((r) => r.id);

// ── insertTransactionSorted ───────────────────────────────────────────────────

test("insert into undefined cache returns a single-item list", () => {
  const t = tx({ id: "new" });
  assert.deepEqual(ids(insertTransactionSorted(undefined, t)), ["new"]);
});

test("insert into empty list", () => {
  const t = tx({ id: "new" });
  assert.deepEqual(ids(insertTransactionSorted([], t)), ["new"]);
});

test("newest date goes to the front (lists are date-desc)", () => {
  const existing = [
    tx({ id: "a", date: "2026-05-10" }),
    tx({ id: "b", date: "2026-05-01" }),
  ];
  const t = tx({ id: "new", date: "2026-05-20" });
  assert.deepEqual(ids(insertTransactionSorted(existing, t)), ["new", "a", "b"]);
});

test("oldest date goes to the back", () => {
  const existing = [
    tx({ id: "a", date: "2026-05-10" }),
    tx({ id: "b", date: "2026-05-05" }),
  ];
  const t = tx({ id: "new", date: "2026-05-01" });
  assert.deepEqual(ids(insertTransactionSorted(existing, t)), ["a", "b", "new"]);
});

test("middle date lands in the correct slot", () => {
  const existing = [
    tx({ id: "a", date: "2026-05-20" }),
    tx({ id: "b", date: "2026-05-01" }),
  ];
  const t = tx({ id: "new", date: "2026-05-10" });
  assert.deepEqual(ids(insertTransactionSorted(existing, t)), ["a", "new", "b"]);
});

test("same date: newer created_at comes first", () => {
  const existing = [
    tx({ id: "a", date: "2026-05-10", created_at: "2026-05-10T08:00:00.000Z" }),
  ];
  const t = tx({
    id: "new",
    date: "2026-05-10",
    created_at: "2026-05-10T09:00:00.000Z",
  });
  assert.deepEqual(ids(insertTransactionSorted(existing, t)), ["new", "a"]);
});

test("same date: older created_at comes after", () => {
  const existing = [
    tx({ id: "a", date: "2026-05-10", created_at: "2026-05-10T08:00:00.000Z" }),
  ];
  const t = tx({
    id: "new",
    date: "2026-05-10",
    created_at: "2026-05-10T07:00:00.000Z",
  });
  assert.deepEqual(ids(insertTransactionSorted(existing, t)), ["a", "new"]);
});

test("upsert: an existing id is replaced, not duplicated", () => {
  const existing = [
    tx({ id: "a", date: "2026-05-10", amount: 100 }),
    tx({ id: "b", date: "2026-05-05" }),
  ];
  const updated = tx({ id: "a", date: "2026-05-10", amount: 999 });
  const result = insertTransactionSorted(existing, updated);
  assert.deepEqual(ids(result), ["a", "b"]);
  assert.equal(result[0].amount, 999);
});

test("does not mutate the input array", () => {
  const existing = [tx({ id: "a", date: "2026-05-10" })];
  const snapshot = ids(existing);
  insertTransactionSorted(existing, tx({ id: "new", date: "2026-05-20" }));
  assert.deepEqual(ids(existing), snapshot);
});

// ── removeTransactionById ─────────────────────────────────────────────────────

test("remove matching id, preserving order of the rest", () => {
  const existing = [tx({ id: "a" }), tx({ id: "b" }), tx({ id: "c" })];
  assert.deepEqual(ids(removeTransactionById(existing, "b")), ["a", "c"]);
});

test("remove absent id leaves the list unchanged", () => {
  const existing = [tx({ id: "a" }), tx({ id: "b" })];
  assert.deepEqual(ids(removeTransactionById(existing, "zzz")), ["a", "b"]);
});

test("remove from undefined cache returns empty list", () => {
  assert.deepEqual(removeTransactionById(undefined, "a"), []);
});

test("remove does not mutate the input array", () => {
  const existing = [tx({ id: "a" }), tx({ id: "b" })];
  removeTransactionById(existing, "a");
  assert.deepEqual(ids(existing), ["a", "b"]);
});

// ── budgetMonthOf ─────────────────────────────────────────────────────────────

test("budgetMonthOf: explicit budget_month wins over the date month", () => {
  assert.equal(
    budgetMonthOf(tx({ date: "2026-05-15", budget_month: "2026-07" })),
    "2026-07"
  );
});

test("budgetMonthOf: null budget_month falls back to the date's month", () => {
  assert.equal(
    budgetMonthOf(tx({ date: "2026-05-15", budget_month: null })),
    "2026-05"
  );
});

test("budgetMonthOf: undefined budget_month falls back to the date's month", () => {
  assert.equal(
    budgetMonthOf(tx({ date: "2026-05-15", budget_month: undefined })),
    "2026-05"
  );
});

// ── incomeBelongsToBudgetMonth ────────────────────────────────────────────────

test("income with matching date-month belongs to that budget month", () => {
  const t = tx({ type: "income", date: "2026-05-15", budget_month: null });
  assert.equal(incomeBelongsToBudgetMonth(t, "2026-05"), true);
  assert.equal(incomeBelongsToBudgetMonth(t, "2026-06"), false);
});

test("income with explicit budget_month belongs to that month, not its date month", () => {
  const t = tx({ type: "income", date: "2026-05-15", budget_month: "2026-07" });
  assert.equal(incomeBelongsToBudgetMonth(t, "2026-07"), true);
  assert.equal(incomeBelongsToBudgetMonth(t, "2026-05"), false);
});

test("expenses never belong to a budget-income month", () => {
  const t = tx({ type: "expense", date: "2026-05-15", budget_month: null });
  assert.equal(incomeBelongsToBudgetMonth(t, "2026-05"), false);
});
