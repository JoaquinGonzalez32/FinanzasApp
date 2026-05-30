import { QueryClient } from '@tanstack/react-query';
import type { Transaction } from '../types/database';
import { insertTransactionSorted, removeTransactionById } from './optimisticTransactions';

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

/**
 * Optimistic patches for the transaction list caches.
 *
 * Each cached transaction list (`['transactions', ...]`) is patched in place so
 * the UI reflects a create/delete instantly, before the network round-trip.
 * Every helper returns a `rollback()` that restores the exact prior snapshots —
 * call it from a mutation's error path. The accompanying refetch (via
 * `invalidate.transactions()`) reconciles the cache with the server afterwards.
 */
function patchTransactionCaches(
    patch: (rows: Transaction[] | undefined) => Transaction[],
): () => void {
    const snapshots = queryClient.getQueriesData<Transaction[]>({
        queryKey: qk.transactionsRoot,
    });
    for (const [key] of snapshots) {
        queryClient.setQueryData<Transaction[]>(key, (rows) => patch(rows));
    }
    return () => {
        for (const [key, data] of snapshots) {
            queryClient.setQueryData(key, data);
        }
    };
}

export const optimisticTx = {
    /** Insert (or upsert) a transaction into every list cache. */
    insert: (tx: Transaction) =>
        patchTransactionCaches((rows) => insertTransactionSorted(rows, tx)),
    /** Remove a transaction from every list cache. */
    remove: (id: string) =>
        patchTransactionCaches((rows) => removeTransactionById(rows, id)),
    /** Swap a temporary (optimistic) row for the authoritative server row. */
    replace: (tempId: string, real: Transaction) =>
        patchTransactionCaches((rows) =>
            insertTransactionSorted(removeTransactionById(rows, tempId), real),
        ),
};
