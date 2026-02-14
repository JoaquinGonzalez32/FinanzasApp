import { supabase } from "../lib/supabase";
import type { Transaction, TransactionInsert } from "../types/database";

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
  const { data, error } = await supabase
    .from("transactions")
    .insert(tx)
    .select("*, category:categories(*)")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;
}
