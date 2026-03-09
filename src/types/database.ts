export type TransactionType = "expense" | "income";

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: TransactionType;
  category_id: string | null;
  account_id: string | null;
  note: string | null;
  date: string; // ISO date string YYYY-MM-DD
  created_at: string;
  recurring_id?: string | null;
  budget_month?: string | null; // YYYY-MM — which month this income counts toward for budget. null = same as date month
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
  account_id: string | null;
}

export interface TransactionInsert {
  amount: number;
  type: TransactionType;
  category_id?: string | null;
  account_id?: string | null;
  note?: string | null;
  date: string;
  recurring_id?: string | null;
  budget_month?: string | null;
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

export type AccountCurrency = "UYU" | "USD" | "EUR";

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  icon: string;
  color: string;
  balance: number;
  currency: AccountCurrency;
  include_in_total: boolean;
  created_at: string;
}

export interface AccountInsert {
  name: string;
  type: AccountType;
  icon: string;
  color: string;
  balance?: number;
  currency?: AccountCurrency;
  include_in_total?: boolean;
}

export interface CategoryUpdate {
  name?: string;
  icon?: string;
  color?: string;
  type?: TransactionType;
  sort_order?: number;
  account_id?: string | null;
}

export interface BudgetItem {
  id: string;
  user_id: string;
  category_id: string;
  account_id: string | null;
  percentage: number;
  month: string;
  sort_order: number;
  created_at: string;
  category?: Category;
}

export interface BudgetItemInsert {
  category_id: string;
  account_id?: string | null;
  percentage: number;
  month: string;
  sort_order?: number;
}

export type GoalStatus = "active" | "completed" | "paused" | "cancelled";

export interface SavingsGoal {
  id: string;
  user_id: string;
  account_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  currency: AccountCurrency;
  deadline: string | null;
  status: GoalStatus;
  icon: string;
  color: string;
  priority: number;
  created_at: string;
}

export interface SavingsGoalInsert {
  account_id: string;
  name: string;
  target_amount: number;
  currency?: AccountCurrency;
  deadline?: string | null;
  icon?: string;
  color?: string;
  priority?: number;
}

export interface GoalContribution {
  id: string;
  user_id: string;
  goal_id: string;
  amount: number;
  note: string | null;
  created_at: string;
}

export interface CategoryAssignment {
  budgetItemId: string | null;
  categoryId: string;
  category: Category;
  amount: number;
  isLocal: boolean;
  account_id?: string | null;
}

export interface DonutSlice {
  label: string;
  amount: number;
  percentage: number;
  color: string;
  icon?: string;
}

export interface RecurringExpense {
  id: string;
  user_id: string;
  category_id: string;
  account_id: string | null;
  /** Fixed monthly amount */
  amount: number;
  /** Day of month to apply (1–28) */
  day_of_month: number;
  is_active: boolean;
  created_at: string;
  category?: Category;
}

export interface RecurringExpenseInsert {
  category_id: string;
  account_id?: string | null;
  amount: number;
  day_of_month: number;
}
