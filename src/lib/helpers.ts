import type { Transaction, Category, BudgetItem, CategoryAssignment, DonutSlice } from "../types/database";

export const CATEGORY_COLORS: Record<string, { bg: string; bgCircle: string; hex: string }> = {
  orange:  { bg: "bg-orange-100 dark:bg-orange-500/20",  bgCircle: "bg-orange-500/20",  hex: "#ea580c" },
  blue:    { bg: "bg-blue-100 dark:bg-blue-500/20",      bgCircle: "bg-blue-500/20",    hex: "#2563eb" },
  green:   { bg: "bg-green-100 dark:bg-green-500/20",    bgCircle: "bg-green-500/20",   hex: "#16a34a" },
  purple:  { bg: "bg-purple-100 dark:bg-purple-500/20",  bgCircle: "bg-purple-500/20",  hex: "#9333ea" },
  emerald: { bg: "bg-emerald-100 dark:bg-emerald-500/20",bgCircle: "bg-emerald-500/20", hex: "#10b981" },
  rose:    { bg: "bg-rose-100 dark:bg-rose-500/20",      bgCircle: "bg-rose-500/20",    hex: "#f43f5e" },
  red:     { bg: "bg-red-100 dark:bg-red-500/20",        bgCircle: "bg-red-500/20",     hex: "#ef4444" },
  primary: { bg: "bg-primary/10",                         bgCircle: "bg-primary/20",     hex: "#137fec" },
  slate:   { bg: "bg-slate-100 dark:bg-slate-500/20",    bgCircle: "bg-slate-500/20",   hex: "#64748b" },
};

const DEFAULT_STYLE = { bg: "bg-slate-100 dark:bg-slate-500/20", bgCircle: "bg-slate-500/20", hex: "#64748b" };

export function getCategoryStyle(color?: string) {
  return CATEGORY_COLORS[color ?? ""] ?? DEFAULT_STYLE;
}

export function formatCurrency(amount: number | string, currency?: string): string {
  const num = Math.abs(Number(amount));
  const parts = num.toFixed(2).split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${getCurrencySymbol(currency)}${parts.join(".")}`;
}

export function formatAmount(amount: number | string, type: "expense" | "income"): string {
  const formatted = formatCurrency(amount);
  return type === "expense" ? `-${formatted}` : `+${formatted}`;
}

export function formatTime(isoString: string): string {
  const d = new Date(isoString);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m} ${ampm}`;
}

export function toDateISO(date?: Date): string {
  const d = date ?? new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

export function sumByType(transactions: Transaction[], type: "expense" | "income"): number {
  return transactions
    .filter((t) => t.type === type)
    .reduce((sum, t) => sum + Number(t.amount), 0);
}

export interface CategorySummary {
  category: Category;
  total: number;
  count: number;
}

export function groupByCategory(transactions: Transaction[]): CategorySummary[] {
  const map = new Map<string, CategorySummary>();
  for (const tx of transactions) {
    if (!tx.category) continue;
    const key = tx.category.id;
    const existing = map.get(key);
    if (existing) {
      existing.total += Number(tx.amount);
      existing.count++;
    } else {
      map.set(key, { category: tx.category, total: Number(tx.amount), count: 1 });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export const DAYS_ES = [
  "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado",
];

export function getCurrencySymbol(currency?: string): string {
  switch (currency) {
    case "UYU": return "$U";
    case "USD": return "US$";
    case "EUR": return "€";
    default: return "$";
  }
}

// ── Month helpers ──────────────────────────────────────────────

export function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function parseMonth(month: string): { year: number; month: number } {
  const [y, m] = month.split("-").map(Number);
  return { year: y, month: m };
}

export function shiftMonth(month: string, delta: number): string {
  const { year, month: m } = parseMonth(month);
  const d = new Date(year, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(month: string): string {
  const { month: m, year } = parseMonth(month);
  return `${MONTHS_ES[m - 1]} ${year}`;
}

// ── Distribution helpers ───────────────────────────────────────

export function getMonthIncomeTotal(transactions: Transaction[]): number {
  return sumByType(transactions, "income");
}

export function getCategoryAssignments(budgetItems: BudgetItem[]): CategoryAssignment[] {
  return budgetItems.map((b) => ({
    budgetItemId: b.id,
    categoryId: b.category_id,
    category: b.category!,
    amount: Number(b.percentage) || 0,
    isLocal: false,
  }));
}

export function getAssignedTotal(assignments: CategoryAssignment[]): number {
  return assignments.reduce((sum, a) => sum + a.amount, 0);
}

export function getUnassigned(total: number, assigned: number): number {
  return total - assigned;
}

export function buildDonutData(
  assignments: CategoryAssignment[],
  unassigned: number,
  total: number,
): DonutSlice[] {
  if (total <= 0) return [];

  const slices: DonutSlice[] = assignments
    .filter((a) => a.amount > 0)
    .map((a) => ({
      label: a.category.name,
      amount: a.amount,
      percentage: (a.amount / total) * 100,
      color: CATEGORY_COLORS[a.category.color]?.hex ?? "#64748b",
      icon: a.category.icon,
    }));

  if (unassigned > 0) {
    slices.push({
      label: "Sin asignar",
      amount: unassigned,
      percentage: (unassigned / total) * 100,
      color: "#cbd5e1",
    });
  }

  return slices;
}
