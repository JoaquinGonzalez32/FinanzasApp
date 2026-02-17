export type TransactionType = "expense" | "income";

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: TransactionType;
  category_id: string | null;
  note: string | null;
  date: string; // ISO date string YYYY-MM-DD
  created_at: string;
  // joined from categories
  category?: Category;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  sort_order: number;
}

export interface TransactionInsert {
  amount: number;
  type: TransactionType;
  category_id?: string | null;
  note?: string | null;
  date: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdate {
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  currency?: string | null;
}

export type AccountType = "cash" | "bank" | "credit" | "savings" | "other";

export type AccountCurrency = "UYU" | "USD";

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  icon: string;
  color: string;
  balance: number;
  currency: AccountCurrency;
  created_at: string;
}

export interface AccountInsert {
  name: string;
  type: AccountType;
  icon: string;
  color: string;
  balance?: number;
  currency?: AccountCurrency;
}

export interface CategoryUpdate {
  name?: string;
  icon?: string;
  color?: string;
  type?: TransactionType;
  sort_order?: number;
}

export interface BudgetItem {
  id: string;
  user_id: string;
  category_id: string;
  percentage: number;
  sort_order: number;
  created_at: string;
  category?: Category;
}

export interface BudgetItemInsert {
  category_id: string;
  percentage: number;
  sort_order?: number;
}
