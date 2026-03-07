/**
 * HOME SCREEN — "Como vengo este mes?"
 *
 * LAYOUT (top to bottom):
 * ┌──────────────────────────────┐
 * │  Header: Avatar · Month · Search  │
 * ├──────────────────────────────┤
 * │  Summary Card (indigo gradient)    │
 * │  ┌─ Gastado este mes ──────────┐  │
 * │  │  $U 1,019                   │  │
 * │  │  ▓▓▓▓▓▓▓▓░░░░ 14.6%        │  │
 * │  │  ~$U249/dia · 24 dias left  │  │
 * │  └────────────────────────────┘  │
 * ├──────────────────────────────┤
 * │  Quick Stats: Income · Available  │
 * ├──────────────────────────────┤
 * │  Category Alerts (if any)         │
 * │  Pending Recurring (if any)       │
 * │  Savings Goals Widget (if any)    │
 * │  Analytics Widget (if summary)    │
 * │  Weekly Alert (if visible)        │
 * ├──────────────────────────────┤
 * │  RECENT TRANSACTIONS (last 7)     │
 * │  Groups: Hoy · Ayer · Earlier     │
 * └──────────────────────────────┘
 * [FAB +] bottom-right
 *
 * KEY CHANGES FROM PREVIOUS:
 * - No dark hero gradient — clean indigo card within the light background
 * - "Recent" section shows last 5-7 transactions, not just today
 * - Daily budget rate is prominent inside the summary card
 * - Better empty state with CTA
 * - Budget CTA moved inside summary area when no budget exists
 */
import { View, Text, ScrollView, Image, TouchableOpacity, RefreshControl, Animated as RNAnimated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import TransactionRow from '../../components/ui/TransactionRow';
import ConfirmModal from '../../components/ConfirmModal';
import { SkeletonLoader, useToast, FadeIn, ScalePress, AnimatedProgressBar, ActionButton, EmptyState, FrostBackground } from '../../components/ui';
import { useTransactions } from '../../src/hooks/useTransactions';
import { useProfile } from '../../src/hooks/useProfile';
import { deleteTransaction } from '../../src/services/transactionsService';
import { emitTransactionsChange } from '../../src/lib/events';
// useAccounts now consumed via AccountContext
import { useBudget } from '../../src/hooks/useBudget';
import { formatCurrency, toDateISO, sumByType, getCurrencySymbol, getCurrentMonth, MONTHS_ES, getCategoryStyle, getAssignedTotal, getCategoryAssignments } from '../../src/lib/helpers';
import { useWeeklyReviewAlert } from '../../src/hooks/useWeeklyReviewAlert';
import { usePendingRecurringCount } from '../../src/hooks/usePendingRecurringCount';
import { useSavingsGoals } from '../../src/hooks/useSavingsGoals';
import GoalsSummaryWidget from '../../components/GoalsSummaryWidget';
import AnalyticsSummaryWidget from '../../src/features/analytics/components/widgets/AnalyticsSummaryWidget';
import { useAnalytics } from '../../src/features/analytics/hooks/useAnalytics';
import { useInsights } from '../../src/features/analytics/hooks/useInsights';
import { useAccountContext } from '../../src/context/AccountContext';
import { useFilteredTransactions, useCurrencyTotals } from '../../src/hooks/useFilteredByAccount';
import AccountSwitcher from '../../src/components/AccountSwitcher';

function getDaysRemaining() {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return lastDay - now.getDate();
}

function getDaysInMonth() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
}

function AnimatedCounter({ value, currency }) {
    const animValue = useRef(new RNAnimated.Value(0)).current;
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        animValue.setValue(0);
        RNAnimated.timing(animValue, {
            toValue: value,
            duration: 800,
            useNativeDriver: false,
        }).start();
    }, [value]);

    useEffect(() => {
        const id = animValue.addListener(({ value: v }) => setDisplay(Math.round(v)));
        return () => animValue.removeListener(id);
    }, []);

    return (
        <Text className="text-display-lg font-extrabold text-white tracking-tight">
            {formatCurrency(display, currency)}
        </Text>
    );
}

function budgetBarColor(pct) {
    if (pct >= 100) return '#EF4444';
    if (pct >= 85) return '#F59E0B';
    if (pct >= 65) return '#818CF8';
    return '#10B981';
}

export default function HomeScreen() {
    const router = useRouter();
    const { profile } = useProfile();
    const { transactions: allMonthTx, loading, error, refresh } = useTransactions({ mode: 'month' });
    const { selectedAccountId, selectedAccount, accounts, isAllAccounts } = useAccountContext();
    const currentMonth = useMemo(() => getCurrentMonth(), []);
    const { budgetItems } = useBudget(currentMonth);
    const [refreshing, setRefreshing] = useState(false);
    const [deleteTx, setDeleteTx] = useState(null);
    const { show: showToast, ToastComponent } = useToast();

    const monthTx = useFilteredTransactions(allMonthTx);

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
    const incomeByCurrency = useCurrencyTotals(monthTx, accMap, 'income');

    const monthTotalExpense = useMemo(() => sumByType(monthTx, 'expense'), [monthTx]);
    const monthTotalIncome = useMemo(() => sumByType(monthTx, 'income'), [monthTx]);

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
                alerts.push({
                    name: a.category?.name ?? 'Sin categoria',
                    icon: a.category?.icon ?? 'category',
                    color: a.category?.color,
                    spent, planned: a.amount, pct,
                    remaining: a.amount - spent,
                });
            }
        }
        return alerts.sort((a, b) => b.pct - a.pct).slice(0, 3);
    }, [budgetItems, monthTx]);

    const txAccount = (tx) => accMap[tx.account_id ?? tx.category?.account_id];

    // Recent transactions: last 7 from this month, grouped by day label
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

    const weeklyAlert = useWeeklyReviewAlert(monthTx, loading);
    const pendingRecurringCount = usePendingRecurringCount();
    const { goals: activeGoals } = useSavingsGoals();
    const { currentSummary, previousSummary } = useAnalytics();
    const { topInsight, dismiss: dismissInsight } = useInsights(
        currentSummary ? [currentSummary] : [],
        primaryCurrency,
    );

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
            showToast({ type: 'error', message: 'Error al eliminar' });
        }
    };

    const now = new Date();
    const monthName = MONTHS_ES[now.getMonth()];
    const progressColor = budgetProgress ? budgetBarColor(budgetProgress.percentage) : '#10B981';

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

                {/* ============ SUMMARY CARD ============ */}
                <FadeIn delay={100}>
                    <View className="px-5 pb-4">
                        <View className="rounded-3xl overflow-hidden shadow-lg">
                            <LinearGradient
                                colors={['#6366F1', '#4F46E5', '#4338CA']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                className="px-5 pt-6 pb-5"
                            >
                                {/* Decorative */}
                                <View className="absolute -top-8 -right-8 w-32 h-32 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
                                <View className="absolute bottom-2 -left-6 w-20 h-20 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />

                                <Text className="text-xs font-semibold text-indigo-200 uppercase tracking-widest mb-2">
                                    Gastado este mes
                                </Text>

                                {loading && !refreshing ? (
                                    <View className="h-14 w-48 bg-white/10 rounded-2xl" />
                                ) : isAllAccounts && Object.keys(expenseByCurrency).length > 1 ? (
                                    <View className="gap-1">
                                        {Object.entries(expenseByCurrency).map(([cur, total]) => (
                                            <AnimatedCounter key={cur} value={total} currency={cur} />
                                        ))}
                                    </View>
                                ) : (
                                    <AnimatedCounter value={monthTotalExpense} currency={primaryCurrency} />
                                )}

                                {budgetProgress && (
                                    <>
                                        <View className="mt-4">
                                            <AnimatedProgressBar
                                                percentage={budgetProgress.percentage}
                                                color={progressColor}
                                                height={6}
                                                delay={500}
                                                trackColor="rgba(255,255,255,0.15)"
                                            />
                                        </View>
                                        <View className="flex-row items-center justify-between mt-3">
                                            <View className="flex-row items-center gap-1.5">
                                                <View className="h-5 w-5 rounded-full bg-white/15 items-center justify-center">
                                                    <MaterialIcons name="speed" size={11} color="rgba(255,255,255,0.9)" />
                                                </View>
                                                <Text className="text-sm font-bold text-white/90">
                                                    {formatCurrency(budgetProgress.dailyBudget, primaryCurrency)}/dia
                                                </Text>
                                            </View>
                                            <Text className="text-xs text-white/60 font-medium">
                                                {budgetProgress.daysLeft} dia{budgetProgress.daysLeft !== 1 ? 's' : ''} · {formatCurrency(budgetProgress.remaining, primaryCurrency)} disponible
                                            </Text>
                                        </View>
                                    </>
                                )}

                                {!budgetProgress && !loading && (
                                    <TouchableOpacity
                                        onPress={() => router.push({ pathname: '/(tabs)/dashboard' })}
                                        className="flex-row items-center gap-2 mt-4 bg-white/15 self-start px-4 py-2.5 rounded-xl"
                                    >
                                        <MaterialIcons name="pie-chart-outline" size={16} color="rgba(255,255,255,0.9)" />
                                        <Text className="text-sm font-bold text-white/90">Planifica tu mes</Text>
                                    </TouchableOpacity>
                                )}
                            </LinearGradient>
                        </View>
                    </View>
                </FadeIn>

                {/* ============ QUICK STATS ============ */}
                {(monthTotalIncome > 0 || (budgetProgress && budgetProgress.remaining > 0)) && (
                    <FadeIn delay={200}>
                        <View className="flex-row items-center gap-3 px-5 pb-4 flex-wrap">
                            {isAllAccounts && Object.keys(incomeByCurrency).length > 1 ? (
                                Object.entries(incomeByCurrency).map(([cur, total]) => (
                                    <View key={cur} className="flex-row items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 rounded-xl border border-emerald-100 dark:border-emerald-900/20">
                                        <MaterialIcons name="arrow-upward" size={12} color="#10B981" />
                                        <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                            +{formatCurrency(total, cur)}
                                        </Text>
                                    </View>
                                ))
                            ) : monthTotalIncome > 0 ? (
                                <View className="flex-row items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 rounded-xl border border-emerald-100 dark:border-emerald-900/20">
                                    <MaterialIcons name="arrow-upward" size={12} color="#10B981" />
                                    <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                        +{formatCurrency(monthTotalIncome, primaryCurrency)}
                                    </Text>
                                </View>
                            ) : null}
                            {budgetProgress && (
                                <View className="flex-row items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl">
                                    <MaterialIcons name="account-balance-wallet" size={12} color="#64748b" />
                                    <Text className="text-xs font-bold text-slate-600 dark:text-slate-400">
                                        {formatCurrency(budgetProgress.planned, primaryCurrency)} planificado
                                    </Text>
                                </View>
                            )}
                        </View>
                    </FadeIn>
                )}

                {/* ============ ALERTS SECTION ============ */}

                {/* Category Alerts */}
                {categoryAlerts.length > 0 && (
                    <View className="px-5 pb-3 gap-2">
                        {categoryAlerts.map((alert, i) => {
                            const style = getCategoryStyle(alert.color);
                            const isOver = alert.pct >= 100;
                            return (
                                <FadeIn key={i} delay={300 + i * 60}>
                                    <ScalePress onPress={() => router.push({ pathname: '/(tabs)/dashboard' })}>
                                        <View className={`flex-row items-center gap-3 px-3.5 py-3 rounded-2xl border ${isOver ? 'bg-red-50 dark:bg-red-500/8 border-red-200 dark:border-red-900/20' : 'bg-amber-50 dark:bg-amber-500/8 border-amber-200 dark:border-amber-900/20'}`}>
                                            <View className={`h-8 w-8 rounded-xl items-center justify-center ${style.bg}`}>
                                                <MaterialIcons name={alert.icon} size={16} color={style.hex} />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-sm font-bold text-slate-800 dark:text-white">{alert.name}</Text>
                                                <Text className={`text-xs mt-0.5 ${isOver ? 'text-red-500' : 'text-amber-600 dark:text-amber-400'}`}>
                                                    {isOver
                                                        ? `Excedido en ${formatCurrency(Math.abs(alert.remaining), primaryCurrency)}`
                                                        : `Al ${Math.round(alert.pct)}% — quedan ${formatCurrency(alert.remaining, primaryCurrency)}`
                                                    }
                                                </Text>
                                            </View>
                                            <View className={`h-8 w-8 rounded-full items-center justify-center ${isOver ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                                                <Text className={`text-xs font-extrabold ${isOver ? 'text-red-500' : 'text-amber-600'}`}>
                                                    {Math.round(alert.pct)}%
                                                </Text>
                                            </View>
                                        </View>
                                    </ScalePress>
                                </FadeIn>
                            );
                        })}
                    </View>
                )}

                {/* Pending Recurring */}
                {pendingRecurringCount > 0 && (
                    <FadeIn delay={350}>
                        <View className="px-5 pb-3">
                            <ScalePress onPress={() => router.push('/recurring')}>
                                <View className="flex-row items-center gap-3 bg-primary-faint dark:bg-primary/8 rounded-2xl px-4 py-3 border border-indigo-100 dark:border-indigo-900/20">
                                    <View className="h-8 w-8 rounded-xl bg-primary/15 items-center justify-center">
                                        <MaterialIcons name="repeat" size={16} color="#6366F1" />
                                    </View>
                                    <Text className="flex-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                                        {pendingRecurringCount} recurrente{pendingRecurringCount !== 1 ? 's' : ''} pendiente{pendingRecurringCount !== 1 ? 's' : ''}
                                    </Text>
                                    <MaterialIcons name="chevron-right" size={16} color="#6366F1" />
                                </View>
                            </ScalePress>
                        </View>
                    </FadeIn>
                )}

                {/* Savings Goals Widget */}
                {activeGoals.length > 0 && (
                    <FadeIn delay={400}>
                        <View className="px-5 pb-3">
                            <GoalsSummaryWidget
                                goals={activeGoals.slice(0, 3)}
                                onPress={() => router.push({ pathname: '/(tabs)/goals' })}
                            />
                        </View>
                    </FadeIn>
                )}

                {/* Analytics Widget */}
                {currentSummary && (
                    <FadeIn delay={420}>
                        <View className="px-5 pb-3">
                            <AnalyticsSummaryWidget
                                currentSummary={currentSummary}
                                previousSummary={previousSummary}
                                topInsight={topInsight}
                                currency={primaryCurrency}
                                onPress={() => router.push('/analytics')}
                                onInsightDismiss={dismissInsight}
                            />
                        </View>
                    </FadeIn>
                )}

                {/* Weekly Review Alert */}
                {weeklyAlert.visible && weeklyAlert.summary && (
                    <FadeIn delay={350}>
                        <View className="px-5 pb-3">
                            <View className={`rounded-2xl p-4 flex-row items-center gap-3 border ${weeklyAlert.summary.criticaCount > 0 ? 'bg-red-50 dark:bg-red-500/8 border-red-200 dark:border-red-900/20' : 'bg-amber-50 dark:bg-amber-500/8 border-amber-200 dark:border-amber-900/20'}`}>
                                <View className={`h-9 w-9 rounded-xl items-center justify-center ${weeklyAlert.summary.criticaCount > 0 ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
                                    <MaterialIcons
                                        name={weeklyAlert.summary.criticaCount > 0 ? 'error' : 'warning'}
                                        size={20}
                                        color={weeklyAlert.summary.criticaCount > 0 ? '#ef4444' : '#f59e0b'}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm font-bold text-slate-800 dark:text-white">Revision semanal</Text>
                                    <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {[
                                            weeklyAlert.summary.criticaCount > 0 && `${weeklyAlert.summary.criticaCount} critica${weeklyAlert.summary.criticaCount !== 1 ? 's' : ''}`,
                                            weeklyAlert.summary.enRiesgoCount > 0 && `${weeklyAlert.summary.enRiesgoCount} en riesgo`,
                                        ].filter(Boolean).join(' · ')}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => { weeklyAlert.dismiss(); router.push('/planning'); }}
                                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-white/10 shadow-sm"
                                >
                                    <Text className={`text-xs font-bold ${weeklyAlert.summary.criticaCount > 0 ? 'text-red-500' : 'text-amber-600'}`}>Ver</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={weeklyAlert.dismiss} hitSlop={8}>
                                    <MaterialIcons name="close" size={16} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </FadeIn>
                )}

                {/* Error State */}
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
                <View className="px-5 pt-2 flex-1">
                    <FadeIn delay={250}>
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Recientes
                            </Text>
                            {monthTx.length > 7 && (
                                <TouchableOpacity onPress={() => router.push('/(tabs)/month')}>
                                    <Text className="text-xs font-bold text-primary">Ver todo</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </FadeIn>

                    {loading && !refreshing && <SkeletonLoader.List count={3} />}

                    {!loading && recentTx.length === 0 && !error && (
                        <FadeIn delay={350}>
                            <EmptyState
                                icon="receipt-long"
                                title="Sin movimientos este mes"
                                subtitle="Toca + para registrar tu primer gasto"
                                compact
                            />
                        </FadeIn>
                    )}

                    {!loading && recentGroups.map(([label, txs], gi) => (
                        <FadeIn key={label} delay={300 + gi * 50}>
                            <View className="mb-2">
                                <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 mt-2">
                                    {label}
                                </Text>
                                <View className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                                    {txs.map((tx, ti) => (
                                        <View key={tx.id}>
                                            {ti > 0 && <View className="h-px bg-slate-100 dark:bg-slate-800 ml-14" />}
                                            <TransactionRow
                                                transaction={tx}
                                                currency={txAccount(tx)?.currency}
                                                onPress={() => handleEditTx(tx)}
                                                onLongPress={() => handleDeleteTx(tx)}
                                            />
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </FadeIn>
                    ))}
                </View>
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
