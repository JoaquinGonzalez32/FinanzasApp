import { View, Text, ScrollView, Image, TouchableOpacity, RefreshControl, Animated as RNAnimated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import TransactionItem from '../../components/TransactionItem';
import ConfirmModal from '../../components/ConfirmModal';
import { SkeletonLoader, useToast, FadeIn, ScalePress, AnimatedProgressBar, FrostBackground } from '../../components/ui';
import { useTransactions } from '../../src/hooks/useTransactions';
import { useProfile } from '../../src/hooks/useProfile';
import { deleteTransaction } from '../../src/services/transactionsService';
import { emitTransactionsChange } from '../../src/lib/events';
import { useAccounts } from '../../src/hooks/useAccounts';
import { useBudget } from '../../src/hooks/useBudget';
import { formatAmount, formatCurrency, formatTime, getCategoryStyle, toDateISO, sumByType, getCurrencySymbol, getCurrentMonth, MONTHS_ES, getAssignedTotal, getCategoryAssignments } from '../../src/lib/helpers';
import { useWeeklyReviewAlert } from '../../src/hooks/useWeeklyReviewAlert';
import { usePendingRecurringCount } from '../../src/hooks/usePendingRecurringCount';
import { useSavingsGoals } from '../../src/hooks/useSavingsGoals';
import GoalsSummaryWidget from '../../components/GoalsSummaryWidget';

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
        <Text className="text-5xl font-extrabold text-white tracking-tight" style={{ textShadowColor: 'rgba(0,0,0,0.15)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 }}>
            {formatCurrency(display, currency)}
        </Text>
    );
}

function barColor(pct) {
    if (pct >= 100) return '#ef4444';
    if (pct >= 85) return '#f59e0b';
    if (pct >= 65) return '#137fec';
    return '#10b981';
}

export default function HomeScreen() {
    const router = useRouter();
    const { profile } = useProfile();
    const { transactions: monthTx, loading, error, refresh } = useTransactions({ mode: 'month' });
    const { accounts } = useAccounts();
    const currentMonth = useMemo(() => getCurrentMonth(), []);
    const { budgetItems } = useBudget(currentMonth);
    const [refreshing, setRefreshing] = useState(false);
    const [deleteTx, setDeleteTx] = useState(null);
    const { show: showToast, ToastComponent } = useToast();

    // FAB animation
    const fabScale = useRef(new RNAnimated.Value(0)).current;
    useEffect(() => {
        RNAnimated.spring(fabScale, {
            toValue: 1,
            delay: 500,
            tension: 80,
            friction: 8,
            useNativeDriver: true,
        }).start();
    }, []);

    const todayStr = useMemo(() => toDateISO(), []);
    const yesterdayStr = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return toDateISO(d);
    }, []);

    const todayTx = useMemo(() => monthTx.filter(t => t.date === todayStr), [monthTx, todayStr]);
    const yesterdayTx = useMemo(() => monthTx.filter(t => t.date === yesterdayStr), [monthTx, yesterdayStr]);

    const primaryAccount = useMemo(() => accounts[0] ?? null, [accounts]);
    const primaryCurrency = primaryAccount?.currency;

    const monthTotalExpense = useMemo(() => sumByType(monthTx, 'expense'), [monthTx]);
    const monthTotalIncome = useMemo(() => sumByType(monthTx, 'income'), [monthTx]);

    const budgetProgress = useMemo(() => {
        if (budgetItems.length === 0) return null;
        const assignments = getCategoryAssignments(budgetItems);
        const planned = getAssignedTotal(assignments);
        if (planned <= 0) return null;
        const daysLeft = getDaysRemaining();
        const totalDays = getDaysInMonth();
        const remaining = planned - monthTotalExpense;
        const dailyBudget = daysLeft > 0 ? remaining / daysLeft : 0;
        const percentage = (monthTotalExpense / planned) * 100;
        return { planned, remaining, daysLeft, dailyBudget, percentage };
    }, [budgetItems, monthTotalExpense]);

    const categoryAlerts = useMemo(() => {
        if (budgetItems.length === 0) return [];
        const assignments = getCategoryAssignments(budgetItems);
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

    const accMap = useMemo(() => {
        const m = {};
        accounts.forEach(a => { m[a.id] = a; });
        return m;
    }, [accounts]);
    const txAccount = (tx) => accMap[tx.account_id ?? tx.category?.account_id];

    const weeklyAlert = useWeeklyReviewAlert(monthTx, loading);
    const pendingRecurringCount = usePendingRecurringCount();
    const { goals: activeGoals } = useSavingsGoals();

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

    const renderTx = (tx, index) => {
        const style = getCategoryStyle(tx.category?.color);
        const currency = txAccount(tx)?.currency;
        return (
            <FadeIn key={tx.id} delay={index * 40}>
                <TransactionItem
                    icon={tx.category?.icon ?? "payments"}
                    label={tx.category?.name ?? "Sin categoria"}
                    sub={tx.note ? `${tx.note} · ${formatTime(tx.created_at)}` : formatTime(tx.created_at)}
                    amount={formatAmount(tx.amount, tx.type, currency)}
                    colorClass={tx.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}
                    iconBg={style.bg}
                    iconColor={style.hex}
                    onPress={() => handleEditTx(tx)}
                    onDelete={() => handleDeleteTx(tx)}
                />
            </FadeIn>
        );
    };

    const now = new Date();
    const monthName = MONTHS_ES[now.getMonth()];
    const progressColor = budgetProgress ? barColor(budgetProgress.percentage) : '#10b981';

    return (
        <FrostBackground edges={['top']}>
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" colors={['#137fec']} />
                }
            >
                {/* ============ HERO GRADIENT SECTION ============ */}
                <LinearGradient
                    colors={['#0f172a', '#1e3a5f', '#0f172a']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="rounded-b-4xl overflow-hidden"
                    style={{ paddingBottom: budgetProgress ? 24 : 32 }}
                >
                    {/* Decorative circles */}
                    <View className="absolute -top-8 -right-8 w-32 h-32 rounded-full" style={{ backgroundColor: 'rgba(19,127,236,0.12)' }} />
                    <View className="absolute top-20 -left-6 w-20 h-20 rounded-full" style={{ backgroundColor: 'rgba(16,185,129,0.08)' }} />
                    <View className="absolute -bottom-6 right-12 w-24 h-24 rounded-full" style={{ backgroundColor: 'rgba(19,127,236,0.08)' }} />

                    {/* Header */}
                    <View className="flex-row items-center justify-between px-5 pt-4 pb-1">
                        <TouchableOpacity onPress={() => router.push('/profile')} className="h-10 w-10 items-center justify-center">
                            {profile?.avatar_url ? (
                                <Image source={{ uri: profile.avatar_url }} className="h-9 w-9 rounded-full border-2 border-white/30" />
                            ) : (
                                <View className="h-9 w-9 rounded-full bg-white/20 items-center justify-center">
                                    <Text className="text-white text-sm font-bold">
                                        {(profile?.full_name ?? '?').charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <Text className="text-sm font-semibold text-white/70">
                            {monthName} {now.getFullYear()}
                        </Text>
                        <TouchableOpacity onPress={() => router.push('/all-transactions')} className="h-10 w-10 items-center justify-center rounded-full bg-white/10">
                            <MaterialIcons name="search" size={20} color="rgba(255,255,255,0.8)" />
                        </TouchableOpacity>
                    </View>

                    {/* Hero number */}
                    <FadeIn delay={100}>
                        <View className="items-center pt-6 pb-3 px-5">
                            <Text className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-3">
                                Gastado este mes
                            </Text>
                            {loading && !refreshing ? (
                                <View className="h-14 w-48 bg-white/10 rounded-2xl" />
                            ) : (
                                <AnimatedCounter value={monthTotalExpense} currency={primaryCurrency} />
                            )}
                            {budgetProgress && (
                                <Text className="text-sm text-white/60 mt-2 font-medium">
                                    de {formatCurrency(budgetProgress.planned, primaryCurrency)} planificado
                                </Text>
                            )}
                        </View>
                    </FadeIn>

                    {/* Quick stats pills */}
                    <FadeIn delay={250}>
                        <View className="flex-row items-center justify-center gap-3 pt-2 pb-2 px-5">
                            {monthTotalIncome > 0 && (
                                <View className="flex-row items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-full">
                                    <MaterialIcons name="arrow-upward" size={11} color="rgba(255,255,255,0.9)" />
                                    <Text className="text-xs font-bold text-white/90">
                                        +{formatCurrency(monthTotalIncome, primaryCurrency)}
                                    </Text>
                                </View>
                            )}
                            {budgetProgress && budgetProgress.remaining > 0 && (
                                <View className="flex-row items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-full">
                                    <MaterialIcons name="account-balance-wallet" size={11} color="rgba(255,255,255,0.9)" />
                                    <Text className="text-xs font-bold text-white/90">
                                        {formatCurrency(budgetProgress.remaining, primaryCurrency)} disponible
                                    </Text>
                                </View>
                            )}
                        </View>
                    </FadeIn>

                    {/* Progress bar inside hero */}
                    {budgetProgress && (
                        <FadeIn delay={350}>
                            <View className="px-5 pt-3">
                                <AnimatedProgressBar
                                    percentage={budgetProgress.percentage}
                                    color={progressColor}
                                    height={6}
                                    delay={500}
                                    trackColor="rgba(255,255,255,0.15)"
                                />
                                <View className="flex-row items-center justify-between mt-2">
                                    <Text className="text-xs text-white/50 font-medium">
                                        ~{formatCurrency(budgetProgress.dailyBudget, primaryCurrency)}/dia
                                    </Text>
                                    <Text className="text-xs text-white/50 font-medium">
                                        {budgetProgress.daysLeft} dia{budgetProgress.daysLeft !== 1 ? 's' : ''} restante{budgetProgress.daysLeft !== 1 ? 's' : ''}
                                    </Text>
                                </View>
                            </View>
                        </FadeIn>
                    )}
                </LinearGradient>

                {/* ============ CONTENT BELOW HERO ============ */}

                {/* No budget CTA */}
                {!budgetProgress && !loading && (
                    <FadeIn delay={300}>
                        <View className="px-5 pt-5">
                            <ScalePress onPress={() => router.push({ pathname: '/(tabs)/dashboard' })}>
                                <View className="bg-white/75 dark:bg-card-dark rounded-2xl p-4 border border-dashed border-primary/20 flex-row items-center gap-3 shadow-md"
                                >
                                    <View className="h-10 w-10 rounded-xl bg-primary/10 items-center justify-center">
                                        <MaterialIcons name="pie-chart-outline" size={20} color="#137fec" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-sm font-bold text-stone-700 dark:text-slate-200">Planifica tu mes</Text>
                                        <Text className="text-xs text-stone-400 mt-0.5">Define cuanto queres gastar por categoria</Text>
                                    </View>
                                    <MaterialIcons name="chevron-right" size={20} color="#137fec" />
                                </View>
                            </ScalePress>
                        </View>
                    </FadeIn>
                )}

                {/* Category Alerts */}
                {categoryAlerts.length > 0 && (
                    <View className="px-5 pt-4 gap-2">
                        {categoryAlerts.map((alert, i) => {
                            const style = getCategoryStyle(alert.color);
                            const isOver = alert.pct >= 100;
                            return (
                                <FadeIn key={i} delay={400 + i * 80}>
                                    <ScalePress onPress={() => router.push({ pathname: '/(tabs)/dashboard' })}>
                                        <View className={`flex-row items-center gap-3 px-3.5 py-3 rounded-2xl border ${isOver ? 'bg-red-50 dark:bg-red-500/8 border-red-100 dark:border-red-900/20' : 'bg-amber-50 dark:bg-amber-500/8 border-amber-100 dark:border-amber-900/20'}`}>
                                            <View className={`h-8 w-8 rounded-xl items-center justify-center ${style.bg}`}>
                                                <MaterialIcons name={alert.icon} size={16} color={style.hex} />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-sm font-bold text-stone-800 dark:text-white">{alert.name}</Text>
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
                    <FadeIn delay={500}>
                        <View className="px-5 pt-3">
                            <ScalePress onPress={() => router.push('/recurring')}>
                                <View className="flex-row items-center gap-3 bg-primary/5 dark:bg-primary/8 rounded-2xl px-4 py-3 border border-primary/10">
                                    <View className="h-8 w-8 rounded-xl bg-primary/15 items-center justify-center">
                                        <MaterialIcons name="repeat" size={16} color="#137fec" />
                                    </View>
                                    <Text className="flex-1 text-sm font-semibold text-stone-600 dark:text-slate-300">
                                        {pendingRecurringCount} recurrente{pendingRecurringCount !== 1 ? 's' : ''} pendiente{pendingRecurringCount !== 1 ? 's' : ''}
                                    </Text>
                                    <MaterialIcons name="chevron-right" size={16} color="#137fec" />
                                </View>
                            </ScalePress>
                        </View>
                    </FadeIn>
                )}

                {/* Savings Goals Widget */}
                {activeGoals.length > 0 && (
                    <FadeIn delay={550}>
                        <View className="px-5 pt-3">
                            <GoalsSummaryWidget
                                goals={activeGoals.slice(0, 3)}
                                onPress={() => router.push({ pathname: '/(tabs)/settings' })}
                            />
                        </View>
                    </FadeIn>
                )}

                {/* Weekly Review Alert */}
                {weeklyAlert.visible && weeklyAlert.summary && (
                    <FadeIn delay={400}>
                        <View className="px-5 pt-3">
                            <View className={`rounded-2xl p-4 flex-row items-center gap-3 border ${weeklyAlert.summary.criticaCount > 0 ? 'bg-red-50 dark:bg-red-500/8 border-red-100 dark:border-red-900/20' : 'bg-amber-50 dark:bg-amber-500/8 border-amber-100 dark:border-amber-900/20'}`}>
                                <View className={`h-9 w-9 rounded-xl items-center justify-center ${weeklyAlert.summary.criticaCount > 0 ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
                                    <MaterialIcons
                                        name={weeklyAlert.summary.criticaCount > 0 ? 'error' : 'warning'}
                                        size={20}
                                        color={weeklyAlert.summary.criticaCount > 0 ? '#ef4444' : '#f59e0b'}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm font-bold text-stone-800 dark:text-white">Revision semanal</Text>
                                    <Text className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
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
                                    <MaterialIcons name="close" size={16} color="#a8a29e" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </FadeIn>
                )}

                {/* Error State */}
                {error && (
                    <View className="px-5 pt-4">
                        <View className="bg-red-50 dark:bg-red-500/8 rounded-2xl p-4 flex-row items-center gap-3 border border-red-100 dark:border-red-900/20">
                            <MaterialIcons name="error-outline" size={18} color="#ef4444" />
                            <Text className="text-red-500 text-xs flex-1 font-medium">{error}</Text>
                            <TouchableOpacity onPress={onRefresh}>
                                <Text className="text-primary font-bold text-xs">Reintentar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ============ TRANSACTIONS ============ */}
                <View className="px-5 pt-5 flex-1">
                    <FadeIn delay={300}>
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">Hoy</Text>
                            {todayTx.length > 0 && (
                                <View className="bg-frost dark:bg-slate-800 h-5 min-w-[20px] items-center justify-center rounded-full px-1.5">
                                    <Text className="text-xs font-bold text-stone-500 dark:text-slate-400">{todayTx.length}</Text>
                                </View>
                            )}
                        </View>
                    </FadeIn>

                    {loading && !refreshing && <SkeletonLoader.List count={3} />}

                    {!loading && todayTx.length === 0 && !error && (
                        <FadeIn delay={400}>
                            <View className="items-center py-8">
                                <View className="h-14 w-14 rounded-2xl bg-frost dark:bg-input-dark items-center justify-center mb-3">
                                    <MaterialIcons name="receipt-long" size={22} color="#d6d3d1" />
                                </View>
                                <Text className="text-stone-400 dark:text-slate-500 text-sm font-medium">Sin movimientos hoy</Text>
                                <Text className="text-stone-300 dark:text-slate-600 text-xs mt-1">Toca + para registrar</Text>
                            </View>
                        </FadeIn>
                    )}

                    {todayTx.map((tx, i) => renderTx(tx, i))}

                    {/* Yesterday */}
                    {yesterdayTx.length > 0 && (
                        <>
                            <FadeIn delay={todayTx.length * 40 + 300}>
                                <View className="flex-row items-center justify-between mb-3 mt-4">
                                    <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">Ayer</Text>
                                    <View className="bg-frost dark:bg-slate-800 h-5 min-w-[20px] items-center justify-center rounded-full px-1.5">
                                        <Text className="text-xs font-bold text-stone-500 dark:text-slate-400">{yesterdayTx.length}</Text>
                                    </View>
                                </View>
                            </FadeIn>
                            {yesterdayTx.map((tx, i) => renderTx(tx, todayTx.length + i))}
                        </>
                    )}
                </View>
            </ScrollView>

            {/* FAB */}
            <RNAnimated.View
                style={{
                    position: 'absolute',
                    bottom: 96,
                    right: 20,
                    transform: [{ scale: fabScale }],
                }}
            >
                <TouchableOpacity
                    onPress={() => router.push({ pathname: '/add-transaction', params: { type: 'expense' } })}
                    activeOpacity={0.85}
                    className="h-14 w-14 rounded-full items-center justify-center"
                    style={{
                        backgroundColor: '#137fec',
                        shadowColor: '#137fec',
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.35,
                        shadowRadius: 12,
                        elevation: 10,
                    }}
                >
                    <MaterialIcons name="add" size={28} color="#ffffff" />
                </TouchableOpacity>
            </RNAnimated.View>

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
