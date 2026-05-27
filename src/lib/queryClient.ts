import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

/**
 * Centralized query-key catalog. Use these instead of inline arrays so
 * invalidations and reads stay in sync.
 */
export const qk = {
    profile: ['profile'] as const,
    transactions: (opts: { mode: string; year?: number; month?: number; date?: string }) =>
        ['transactions', opts] as const,
    transactionsRoot: ['transactions'] as const,
    transactionsRange: (start: string, end: string) =>
        ['transactions', 'range', start, end] as const,
    budgetIncome: (month: string) => ['budgetIncome', month] as const,
    budgetIncomeRoot: ['budgetIncome'] as const,
    categories: (type?: string) => ['categories', type ?? 'all'] as const,
    categoriesRoot: ['categories'] as const,
    accounts: ['accounts'] as const,
    budget: (month: string) => ['budget', month] as const,
    budgetRoot: ['budget'] as const,
    savingsGoals: (accountId?: string | null, mode?: 'active' | 'all') =>
        ['savingsGoals', accountId ?? null, mode ?? 'active'] as const,
    savingsGoalsRoot: ['savingsGoals'] as const,
    goalContributions: (goalId: string | null) =>
        ['goalContributions', goalId] as const,
    goalContributionsRoot: ['goalContributions'] as const,
    recurring: ['recurring'] as const,
    pendingRecurringCount: ['pendingRecurringCount'] as const,
    analytics: (months: string[]) => ['analytics', months] as const,
    analyticsRoot: ['analytics'] as const,
};

/**
 * Invalidation helpers — encode the cascade between related domains.
 *
 * The cascades replicate the implicit dependencies that used to live across
 * multiple onXChange listeners in events.ts:
 *  - tx mutations affect: transactions, budgetIncome, recurring (applied set),
 *    pendingRecurringCount, accounts (balances), analytics
 *  - budget mutations affect: budget
 *  - savings goals affect: savingsGoals, goalContributions
 *  - recurring mutations affect: recurring, pendingRecurringCount
 *  - accounts/categories affect their own caches; tx might also depend on
 *    categories (joined fields), but the existing system did not cascade
 *    that way, so we preserve that.
 */
export const invalidate = {
    transactions: () => {
        queryClient.invalidateQueries({ queryKey: qk.transactionsRoot });
        queryClient.invalidateQueries({ queryKey: qk.budgetIncomeRoot });
        queryClient.invalidateQueries({ queryKey: qk.recurring });
        queryClient.invalidateQueries({ queryKey: qk.pendingRecurringCount });
        queryClient.invalidateQueries({ queryKey: qk.accounts });
        queryClient.invalidateQueries({ queryKey: qk.analyticsRoot });
    },
    categories: () => {
        queryClient.invalidateQueries({ queryKey: qk.categoriesRoot });
    },
    accounts: () => {
        queryClient.invalidateQueries({ queryKey: qk.accounts });
    },
    budget: () => {
        queryClient.invalidateQueries({ queryKey: qk.budgetRoot });
    },
    savingsGoals: () => {
        queryClient.invalidateQueries({ queryKey: qk.savingsGoalsRoot });
        queryClient.invalidateQueries({ queryKey: qk.goalContributionsRoot });
    },
    recurring: () => {
        queryClient.invalidateQueries({ queryKey: qk.recurring });
        queryClient.invalidateQueries({ queryKey: qk.pendingRecurringCount });
    },
    profile: () => {
        queryClient.invalidateQueries({ queryKey: qk.profile });
    },
};
