import { supabase } from "../lib/supabase";
import type { Transaction, TransactionInsert } from "../types/database";
import { adjustAccountBalance, getAccountBalance } from "./accountsService";
import { emitAccountsChange } from "../lib/events";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
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
  // Pre-check: resolve account for balance validation
  let preAccountId = tx.account_id ?? null;
  if (!preAccountId && tx.category_id) {
    const { data: cat } = await supabase
      .from("categories")
      .select("account_id")
      .eq("id", tx.category_id)
      .single();
    preAccountId = cat?.account_id ?? null;
  }

  // Check sufficient balance for expenses
  if (preAccountId && tx.type === "expense") {
    const balance = await getAccountBalance(preAccountId);
    if (balance < tx.amount) {
      throw new Error(
        `Saldo insuficiente. Disponible: $${balance.toLocaleString()}, Gasto: $${tx.amount.toLocaleString()}`
      );
    }
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert(tx)
    .select("*, category:categories(*)")
    .single();

  if (error) throw error;

  // Auto-adjust account balance: prefer explicit account_id, fallback to category's account
  const accountId = data.account_id ?? data.category?.account_id;
  if (accountId) {
    const delta = data.type === "income" ? data.amount : -data.amount;
    await adjustAccountBalance(accountId, delta);
    emitAccountsChange();
  }

  return data;
}

export async function deleteTransaction(id: string): Promise<void> {
  // Fetch transaction with category to check for linked account
  const { data: tx, error: fetchErr } = await supabase
    .from("transactions")
    .select("*, category:categories(*)")
    .eq("id", id)
    .single();

  if (fetchErr) throw fetchErr;

  // Revert account balance: prefer explicit account_id, fallback to category's account
  const accountId = tx.account_id ?? tx.category?.account_id;
  if (accountId) {
    // Reverse: expense was -amount, so revert with +amount; income vice versa
    const delta = tx.type === "income" ? -tx.amount : tx.amount;
    await adjustAccountBalance(accountId, delta);
    emitAccountsChange();
  }

  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}
