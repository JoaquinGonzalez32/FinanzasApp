/**
 * HOME SCREEN — "Como vengo este mes?"
 *
 * LAYOUT (top to bottom):
 * ┌──────────────────────────────┐
 * │  Header: Avatar · Account · Search  │
 * ├──────────────────────────────┤
 * │  MonthStatusCard                    │
 * │  (expense, daily rate, savings,     │
 * │   pace indicator, income, planned)  │
 * ├──────────────────────────────┤
 * │  [ContextualBanner] (max 2)         │
 * ├──────────────────────────────┤
 * │  RecentTransactions (last 7)        │
 * │  Groups: Hoy · Ayer · Earlier       │
 * └──────────────────────────────┘
 * [FAB +] bottom-right
 *
 * REMOVED: GoalsSummaryWidget, AnalyticsSummaryWidget,
 *          standalone quick stats pills, weekly review alert.
 * These are now either integrated into the card (savings rate,
 * income, planned) or surfaced via contextual banners.
 */
import { View, Text, ScrollView, Image, TouchableOpacity, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState, useCallback } from 'react';
import ConfirmModal from '../../components/ConfirmModal';
import { SkeletonLoader, useToast, FadeIn, ActionButton, FrostBackground } from '../../components/ui';
import { useTransactions } from '../../src/hooks/useTransactions';
import { useProfile } from '../../src/hooks/useProfile';
import { deleteTransaction } from '../../src/services/transactionsService';
import { friendlyMessage } from '../../src/lib/friendlyError';
import { emitTransactionsChange } from '../../src/lib/events';
import { useBudget } from '../../src/hooks/useBudget';
import { formatCurrency, toDateISO, sumByType, getCurrentMonth, MONTHS_ES, getCategoryStyle, getAssignedTotal, getCategoryAssignments, monthLabel } from '../../src/lib/helpers';
import { useAutoApplyRecurring } from '../../src/hooks/usePendingRecurringCount';
import { useSavingsGoals } from '../../src/hooks/useSavingsGoals';
import { useAnalytics } from '../../src/features/analytics/hooks/useAnalytics';
import { useInsights } from '../../src/features/analytics/hooks/useInsights';
import { useAccountContext } from '../../src/context/AccountContext';
import { useFilteredTransactions, useCurrencyTotals } from '../../src/hooks/useFilteredByAccount';
import { useBudgetIncome } from '../../src/hooks/useBudgetIncome';
import AccountSwitcher from '../../src/components/AccountSwitcher';
import MonthStatusCard from '../../src/features/home/components/MonthStatusCard';
import ContextualBanner from '../../src/features/home/components/ContextualBanner';
import RecentTransactions from '../../src/features/home/components/RecentTransactions';
import { useHomeBanners } from '../../src/features/home/hooks/useHomeBanners';

function getDaysRemaining() {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return lastDay - now.getDate();
}

export default function HomeScreen() {
    const router = useRouter();
    const { profile } = useProfile();
    const { transactions: allMonthTx, loading, error, refresh } = useTransactions({ mode: 'month' });
    const { selectedAccountId, selectedAccount, accounts, isAllAccounts, selectAccount } = useAccountContext();
    const currentMonth = useMemo(() => getCurrentMonth(), []);
    const { budgetItems } = useBudget(currentMonth);
    const [refreshing, setRefreshing] = useState(false);
    const [deleteTx, setDeleteTx] = useState(null);
    const { show: showToast, ToastComponent } = useToast();

    const monthTx = useFilteredTransactions(allMonthTx);
    const { income: budgetIncomeRaw } = useBudgetIncome(currentMonth);
    const budgetIncomeTx = useFilteredTransactions(budgetIncomeRaw);

    const todayStr = useMemo(() => toDateISO(), []);
    const yesterdayStr = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return toDateISO(d);
    }, []);

    const primaryCurrency = selectedAccount?.currency ?? accounts[0]?.currency;

    const accMap = useMemo(() => {
        const m = {};
        accounts.forEach(a => { m[a.id] = a; });
        return m;
    }, [accounts]);

    const expenseByCurrency = useCurrencyTotals(monthTx, accMap, 'expense');
    const incomeByCurrency = useCurrencyTotals(budgetIncomeTx, accMap, 'income');

    const monthTotalExpense = useMemo(() => sumByType(monthTx, 'expense'), [monthTx]);
    const monthTotalIncome = useMemo(() => sumByType(budgetIncomeTx, 'income'), [budgetIncomeTx]);

    const filteredBudgetItems = useMemo(() => {
        if (!selectedAccountId) return budgetItems;
        return budgetItems.filter(bi => !bi.account_id || bi.account_id === selectedAccountId);
    }, [budgetItems, selectedAccountId]);

    const budgetProgress = useMemo(() => {
        if (filteredBudgetItems.length === 0) return null;
        const assignments = getCategoryAssignments(filteredBudgetItems);
        const planned = getAssignedTotal(assignments);
        if (planned <= 0) return null;
        const daysLeft = getDaysRemaining();
        const remaining = planned - monthTotalExpense;
        const dailyBudget = daysLeft > 0 ? remaining / daysLeft : 0;
        const percentage = (monthTotalExpense / planned) * 100;
        return { planned, remaining, daysLeft, dailyBudget, percentage };
    }, [filteredBudgetItems, monthTotalExpense]);

    // Per-currency budget breakdown for "Todas" mode
    const budgetByCurrency = useMemo(() => {
        if (!isAllAccounts || filteredBudgetItems.length === 0) return null;
        const assignments = getCategoryAssignments(filteredBudgetItems);
        // Group assignments by currency (via account_id → accMap → currency)
        const byCur = {};
        for (const a of assignments) {
            const acc = a.account_id ? accMap[a.account_id] : null;
            const cur = acc?.currency ?? accounts[0]?.currency ?? 'UYU';
            if (!byCur[cur]) byCur[cur] = { planned: 0, expense: 0 };
            byCur[cur].planned += a.amount;
        }
        // Match expense totals
        for (const [cur, exp] of Object.entries(expenseByCurrency)) {
            if (!byCur[cur]) continue;
            byCur[cur].expense = exp;
        }
        // Build progress per currency
        const daysLeft = getDaysRemaining();
        const result = {};
        for (const [cur, data] of Object.entries(byCur)) {
            if (data.planned <= 0) continue;
            const remaining = data.planned - data.expense;
            result[cur] = {
                planned: data.planned,
                remaining,
                daysLeft,
                dailyBudget: daysLeft > 0 ? remaining / daysLeft : 0,
                percentage: (data.expense / data.planned) * 100,
            };
        }
        return Object.keys(result).length > 0 ? result : null;
    }, [isAllAccounts, filteredBudgetItems, accMap, accounts, expenseByCurrency]);

    // Per-account cards for carousel in "Todas" mode
    const accountCards = useMemo(() => {
        if (!isAllAccounts) return null;
        const txAccId = (tx) => tx.account_id ?? tx.category?.account_id;
        const daysLeft = getDaysRemaining();

        return accounts
            .map(acc => {
                const accMonthTx = allMonthTx.filter(tx => txAccId(tx) === acc.id);
                const accIncomeTx = budgetIncomeRaw.filter(tx => txAccId(tx) === acc.id);

                const expense = sumByType(accMonthTx, 'expense');
                const income = sumByType(accIncomeTx, 'income');

                // Budget items explicitly assigned to this account
                const accBudgetItems = budgetItems.filter(bi => bi.account_id === acc.id);
                let budget = null;
                if (accBudgetItems.length > 0) {
                    const assignments = getCategoryAssignments(accBudgetItems);
                    const planned = getAssignedTotal(assignments);
                    if (planned > 0) {
                        const remaining = planned - expense;
                        budget = {
                            planned,
                            remaining,
                            daysLeft,
                            dailyBudget: daysLeft > 0 ? remaining / daysLeft : 0,
                            percentage: (expense / planned) * 100,
                        };
                    }
                }

                const savings = income > 0 ? ((income - expense) / income) * 100 : null;

                return {
                    account: acc,
                    expense,
                    income,
                    budgetProgress: budget,
                    savingsRate: savings,
                    hasActivity: expense > 0 || income > 0 || budget !== null,
                };
            })
            .filter(c => c.hasActivity);
    }, [isAllAccounts, accounts, allMonthTx, budgetIncomeRaw, budgetItems]);

    // Category alerts for banner system
    const categoryAlerts = useMemo(() => {
        if (filteredBudgetItems.length === 0) return [];
        const assignments = getCategoryAssignments(filteredBudgetItems);
        const alerts = [];
        for (const a of assignments) {
            const spent = monthTx
                .filter(t => t.type === 'expense' && t.category_id === a.categoryId)
                .reduce((s, t) => s + Number(t.amount), 0);
            if (a.amount <= 0) continue;
            const pct = (spent / a.amount) * 100;
            if (pct >= 80) {
                const acc = a.account_id ? accMap[a.account_id] : null;
                alerts.push({
                    name: a.category?.name ?? 'Sin categoria',
                    icon: a.category?.icon ?? 'category',
                    color: a.category?.color,
                    spent, planned: a.amount, pct,
                    remaining: a.amount - spent,
                    accountName: isAllAccounts ? acc?.name : undefined,
                    currency: acc?.currency,
                });
            }
        }
        return alerts.sort((a, b) => b.pct - a.pct).slice(0, 3);
    }, [filteredBudgetItems, monthTx, accMap, isAllAccounts]);

    // Savings rate
    const savingsRate = useMemo(() => {
        if (monthTotalIncome <= 0) return null;
        return ((monthTotalIncome - monthTotalExpense) / monthTotalIncome) * 100;
    }, [monthTotalIncome, monthTotalExpense]);

    const txAccount = (tx) => accMap[tx.account_id ?? tx.category?.account_id];

    // Recent transactions: last 7 from this month
    const recentTx = useMemo(() => {
        const sorted = [...monthTx].sort((a, b) => {
            const dateCmp = b.date.localeCompare(a.date);
            if (dateCmp !== 0) return dateCmp;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        return sorted.slice(0, 7);
    }, [monthTx]);

    const recentGroups = useMemo(() => {
        const groups = {};
        for (const tx of recentTx) {
            let label;
            if (tx.date === todayStr) label = 'Hoy';
            else if (tx.date === yesterdayStr) label = 'Ayer';
            else {
                const d = new Date(tx.date + 'T00:00:00');
                label = `${d.getDate()}/${d.getMonth() + 1}`;
            }
            if (!groups[label]) groups[label] = [];
            groups[label].push(tx);
        }
        return Object.entries(groups);
    }, [recentTx, todayStr, yesterdayStr]);

    // Auto-apply recurring templates on app open
    useAutoApplyRecurring();
    const { goals: activeGoals } = useSavingsGoals();
    const { currentSummary } = useAnalytics();
    const { insights } = useInsights(
        currentSummary ? [currentSummary] : [],
        primaryCurrency,
    );

    const { banners, dismiss: dismissBanner } = useHomeBanners({
        categoryAlerts,
        goals: activeGoals,
        insights,
        pendingRecurringCount: 0,
        currency: primaryCurrency,
        accountMap: isAllAccounts ? accMap : undefined,
    });

    // Handlers
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try { await refresh(); } finally { setRefreshing(false); }
    }, [refresh]);

    const handleEditTx = (tx) => {
        router.push({
            pathname: '/add-transaction',
            params: {
                type: tx.type, editId: tx.id, editAmount: String(tx.amount),
                editCategoryId: tx.category_id || '', editAccountId: tx.account_id || '',
                editNote: tx.note || '', editDate: tx.date,
                editBudgetMonth: tx.budget_month || '',
            },
        });
    };

    const handleDeleteTx = (tx) => setDeleteTx(tx);

    const confirmDelete = async () => {
        if (!deleteTx) return;
        const txToDelete = deleteTx;
        setDeleteTx(null);
        try {
            await deleteTransaction(txToDelete.id);
            emitTransactionsChange();
            showToast({ type: 'success', message: `"${txToDelete.category?.name ?? 'Transaccion'}" eliminada` });
        } catch (e) {
            showToast({ type: 'error', message: friendlyMessage(e) });
        }
    };

    const handleBannerPress = (banner) => {
        if (banner.route) {
            router.push({
                pathname: banner.route,
                params: banner.routeParams,
            });
        }
    };

    return (
        <FrostBackground edges={['top']}>
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" colors={['#6366F1']} />
                }
            >
                {/* ============ HEADER ============ */}
                <View className="flex-row items-center justify-between px-5 pt-2 pb-4">
                    <TouchableOpacity onPress={() => router.push('/profile')} className="h-10 w-10 items-center justify-center">
                        {profile?.avatar_url ? (
                            <Image source={{ uri: profile.avatar_url }} className="h-9 w-9 rounded-full border-2 border-slate-200 dark:border-slate-700" />
                        ) : (
                            <View className="h-9 w-9 rounded-full bg-primary-faint dark:bg-primary/10 items-center justify-center">
                                <Text className="text-primary text-sm font-bold">
                                    {(profile?.full_name ?? '?').charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <AccountSwitcher />
                    <TouchableOpacity onPress={() => router.push('/all-transactions')} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                        <MaterialIcons name="search" size={20} color="#64748b" />
                    </TouchableOpacity>
                </View>

                {/* ============ MONTH STATUS CARD ============ */}
                <FadeIn delay={100}>
                    <View style={{ paddingBottom: 16, paddingHorizontal: isAllAccounts && accountCards?.length > 1 ? 0 : 20 }}>
                        <MonthStatusCard
                            monthTotalExpense={monthTotalExpense}
                            primaryCurrency={primaryCurrency}
                            isAllAccounts={isAllAccounts}
                            budgetProgress={budgetProgress}
                            savingsRate={savingsRate}
                            monthTotalIncome={monthTotalIncome}
                            loading={loading}
                            refreshing={refreshing}
                            onPlanPress={() => router.push({ pathname: '/(tabs)/dashboard' })}
                            accounts={accounts}
                            onAccountPress={selectAccount}
                            accountCards={accountCards}
                        />
                    </View>
                </FadeIn>

                {/* ============ CONTEXTUAL BANNERS ============ */}
                {banners.length > 0 && (
                    <View className="px-5 pb-3 gap-2">
                        {banners.map((banner, i) => (
                            <FadeIn key={banner.id} delay={200 + i * 60}>
                                <ContextualBanner
                                    banner={banner}
                                    onPress={() => handleBannerPress(banner)}
                                    onDismiss={dismissBanner}
                                />
                            </FadeIn>
                        ))}
                    </View>
                )}

                {/* ============ ERROR STATE ============ */}
                {error && (
                    <View className="px-5 pb-3">
                        <View className="bg-red-50 dark:bg-red-500/8 rounded-2xl p-4 flex-row items-center gap-3 border border-red-200 dark:border-red-900/20">
                            <MaterialIcons name="error-outline" size={18} color="#ef4444" />
                            <Text className="text-red-500 text-xs flex-1 font-medium">{error}</Text>
                            <TouchableOpacity onPress={onRefresh}>
                                <Text className="text-primary font-bold text-xs">Reintentar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ============ RECENT TRANSACTIONS ============ */}
                <RecentTransactions
                    recentGroups={recentGroups}
                    loading={loading}
                    refreshing={refreshing}
                    hasTransactions={recentTx.length > 0}
                    hasMoreThanShown={monthTx.length > 7}
                    error={error}
                    txAccount={txAccount}
                    isAllAccounts={isAllAccounts}
                    onEditTx={handleEditTx}
                    onDeleteTx={handleDeleteTx}
                    onViewAll={() => router.push('/(tabs)/month')}
                    onAddFirst={() => router.push({
                        pathname: '/add-transaction',
                        params: {
                            type: 'expense',
                            ...(selectedAccountId ? { account: selectedAccountId } : {}),
                        },
                    })}
                />
            </ScrollView>

            {/* FAB */}
            <ActionButton
                onPress={() => router.push({
                    pathname: '/add-transaction',
                    params: {
                        type: 'expense',
                        ...(selectedAccountId ? { account: selectedAccountId } : {}),
                    },
                })}
            />

            <ConfirmModal
                visible={!!deleteTx}
                title="Eliminar transaccion"
                message={deleteTx ? `Eliminar "${deleteTx.category?.name ?? 'Sin categoria'}" por ${formatCurrency(deleteTx.amount, accounts.find(a => a.id === (deleteTx.account_id ?? deleteTx.category?.account_id))?.currency)}?` : ''}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTx(null)}
            />

            {ToastComponent}
        </FrostBackground>
    );
}
