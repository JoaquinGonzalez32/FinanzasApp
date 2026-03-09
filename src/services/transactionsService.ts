import { supabase } from "../lib/supabase";
import type { Transaction, TransactionInsert } from "../types/database";
import { emitAccountsChange } from "../lib/events";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export async function getTodayTransactions(): Promise<Transaction[]> {
  const today = todayISO();
  const { data, error } = await supabase
    .from("transactions")
    .select("*, category:categories(*)")
    .eq("date", today)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getMonthTransactions(
  year?: number,
  month?: number
): Promise<Transaction[]> {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth() + 1;
  const { start, end } = monthRange(y, m);

  const { data, error } = await supabase
    .from("transactions")
    .select("*, category:categories(*)")
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getYearTransactions(
  year: number
): Promise<Transaction[]> {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  const { data, error } = await supabase
    .from("transactions")
    .select("*, category:categories(*)")
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getTransactionsByDate(
  date: string
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*, category:categories(*)")
    .eq("date", date)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createTransaction(
  tx: TransactionInsert
): Promise<Transaction> {
  const { data: txId, error: rpcErr } = await supabase.rpc(
    "create_transaction_atomic",
    {
      p_amount: tx.amount,
      p_type: tx.type,
      p_category_id: tx.category_id ?? null,
      p_account_id: tx.account_id ?? null,
      p_note: tx.note ?? null,
      p_date: tx.date,
      p_recurring_id: tx.recurring_id ?? null,
      p_budget_month: tx.budget_month ?? null,
    }
  );
  if (rpcErr) throw rpcErr;

  // Follow-up SELECT to get full row with category join for UI
  const { data, error: fetchErr } = await supabase
    .from("transactions")
    .select("*, category:categories(*)")
    .eq("id", txId)
    .single();
  if (fetchErr) throw fetchErr;

  const accountId = data.account_id ?? data.category?.account_id;
  if (accountId) emitAccountsChange();
  return data;
}

export async function updateTransaction(
  id: string,
  tx: TransactionInsert
): Promise<Transaction> {
  // Atomic: delete old transaction (reverts balance) then create new one (adjusts balance)
  await deleteTransaction(id);
  return createTransaction(tx);
}

export async function getTransactionsRange(
  startDate: string,
  endDate: string
): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("*, category:categories(*)")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.rpc("delete_transaction_atomic", {
    p_transaction_id: id,
  });
  if (error) throw error;
  emitAccountsChange();
}

/**
 * Get income transactions assigned to a specific budget month.
 * Includes: budget_month = month OR (budget_month IS NULL AND date within month).
 */
export async function getBudgetMonthIncome(
  month: string
): Promise<Transaction[]> {
  const { start, end } = monthRange(
    Number(month.split("-")[0]),
    Number(month.split("-")[1])
  );

  const { data, error } = await supabase
    .from("transactions")
    .select("*, category:categories(*)")
    .eq("type", "income")
    .or(
      `budget_month.eq.${month},and(budget_month.is.null,date.gte.${start},date.lte.${end})`
    )
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
