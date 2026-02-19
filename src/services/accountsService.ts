import { supabase } from "../lib/supabase";
import type { Account, AccountInsert } from "../types/database";

// TODO: Crear tabla en Supabase con:
// CREATE TABLE accounts (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
//   name text NOT NULL,
//   type text NOT NULL DEFAULT 'cash',
//   icon text NOT NULL DEFAULT 'account-balance-wallet',
//   color text NOT NULL DEFAULT 'primary',
//   balance numeric NOT NULL DEFAULT 0,
//   currency text NOT NULL DEFAULT 'UYU',
//   created_at timestamptz DEFAULT now()
// );
// ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Users can manage own accounts" ON accounts
//   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

export async function getAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createAccount(
  account: AccountInsert
): Promise<Account> {
  const { data, error } = await supabase
    .from("accounts")
    .insert(account)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAccount(
  id: string,
  updates: Partial<AccountInsert>
): Promise<Account> {
  const { data, error } = await supabase
    .from("accounts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Get current balance for an account */
export async function getAccountBalance(id: string): Promise<number> {
  const { data, error } = await supabase
    .from("accounts")
    .select("balance")
    .eq("id", id)
    .single();

  if (error) throw error;
  return Number(data.balance);
}

/** Adjust account balance by a delta amount (+/-) */
export async function adjustAccountBalance(
  id: string,
  delta: number
): Promise<void> {
  const { data: acc, error: fetchErr } = await supabase
    .from("accounts")
    .select("balance")
    .eq("id", id)
    .single();

  if (fetchErr) throw fetchErr;

  const newBalance = Number(acc.balance) + delta;
  const { error: updateErr } = await supabase
    .from("accounts")
    .update({ balance: newBalance })
    .eq("id", id);

  if (updateErr) throw updateErr;
}

export async function deleteAccount(id: string): Promise<void> {
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) throw error;
}
