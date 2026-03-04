import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState, useCallback } from 'react';
import TransactionItem from '../../components/TransactionItem';
import ConfirmModal from '../../components/ConfirmModal';
import { useTransactions } from '../../src/hooks/useTransactions';
import { useProfile } from '../../src/hooks/useProfile';
import { deleteTransaction } from '../../src/services/transactionsService';
import { emitTransactionsChange } from '../../src/lib/events';
import { useAccounts } from '../../src/hooks/useAccounts';
import { formatAmount, formatCurrency, formatTime, getCategoryStyle, toDateISO, sumByType } from '../../src/lib/helpers';
import { useWeeklyReviewAlert } from '../../src/hooks/useWeeklyReviewAlert';
import { usePendingRecurringCount } from '../../src/hooks/usePendingRecurringCount';

function buildInsight(todayExpense, monthTx, todayStr) {
    if (monthTx.length === 0) return null;

    const dayTotals = {};
    for (const tx of monthTx) {
        if (tx.type !== 'expense' || tx.date === todayStr) continue;
        dayTotals[tx.date] = (dayTotals[tx.date] || 0) + Number(tx.amount);
    }

    const pastDays = Object.keys(dayTotals);
    if (pastDays.length === 0) return null;

    const avgDaily = pastDays.reduce((s, d) => s + dayTotals[d], 0) / pastDays.length;
    if (avgDaily === 0) return null;

    const diff = ((todayExpense - avgDaily) / avgDaily) * 100;
    const absDiff = Math.abs(Math.round(diff));

    if (todayExpense === 0 && avgDaily > 0) {
        return {
            icon: 'savings',
            iconColor: '#10b981',
            iconBg: 'bg-emerald-500/20',
            text: `No gastaste nada hoy. Tu promedio diario es ${formatCurrency(avgDaily)}.`,
        };
    }

    if (diff <= -5) {
        return {
            icon: 'trending-down',
            iconColor: '#137fec',
            iconBg: 'bg-primary/20',
            boldPrefix: '¡Vas bien!',
            text: ` Tu gasto de hoy es un `,
            highlight: `${absDiff}% menor`,
            highlightColor: 'text-primary',
            suffix: ' que tu promedio diario.',
        };
    }

    if (diff >= 5) {
        return {
            icon: 'trending-up',
            iconColor: '#f43f5e',
            iconBg: 'bg-rose-500/20',
            boldPrefix: '¡Ojo!',
            text: ` Hoy gastaste un `,
            highlight: `${absDiff}% más`,
            highlightColor: 'text-rose-500',
            suffix: ' que tu promedio diario.',
        };
    }

    return {
        icon: 'check-circle',
        iconColor: '#10b981',
        iconBg: 'bg-emerald-500/20',
        boldPrefix: 'Normal.',
        text: ' Tu gasto de hoy está dentro de tu promedio diario.',
    };
}

export default function HomeScreen() {
    const router = useRouter();
    const { profile } = useProfile();
    const { transactions: monthTx, loading, error, refresh } = useTransactions({ mode: 'month' });
    const { accounts } = useAccounts();
    const [refreshing, setRefreshing] = useState(false);
    const [deleteTx, setDeleteTx] = useState(null);

    const todayStr = useMemo(() => toDateISO(), []);
    const yesterdayStr = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return toDateISO(d);
    }, []);

    const todayTx = useMemo(() => monthTx.filter(t => t.date === todayStr), [monthTx, todayStr]);
    const yesterdayTx = useMemo(() => monthTx.filter(t => t.date === yesterdayStr), [monthTx, yesterdayStr]);

    const accountStats = useMemo(() => accounts.map(acc => {
        const linked = monthTx.filter(t => (t.account_id ?? t.category?.account_id) === acc.id);
        const todayLinked = todayTx.filter(t => (t.account_id ?? t.category?.account_id) === acc.id);
        return {
            account: acc,
            monthIncome: sumByType(linked, 'income'),
            monthExpense: sumByType(linked, 'expense'),
            todayExpense: sumByType(todayLinked, 'expense'),
            todayIncome: sumByType(todayLinked, 'income'),
        };
    }), [accounts, monthTx, todayTx]);

    const todayExpense = useMemo(() => sumByType(todayTx, 'expense'), [todayTx]);
    const insight = useMemo(() => buildInsight(todayExpense, monthTx, todayStr), [todayExpense, monthTx, todayStr]);

    const weeklyAlert = useWeeklyReviewAlert(monthTx, loading);
    const pendingRecurringCount = usePendingRecurringCount();

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try { await refresh(); } finally { setRefreshing(false); }
    }, [refresh]);

    const handleDeleteTx = (tx) => setDeleteTx(tx);

    const confirmDelete = async () => {
        if (!deleteTx) return;
        try {
            await deleteTransaction(deleteTx.id);
            emitTransactionsChange();
        } catch (e) {
            if (__DEV__) console.log('Delete error:', e.message);
        } finally {
            setDeleteTx(null);
        }
    };

    // TODO: Notificaciones - implementar sistema de notificaciones push
    const handleNotifications = () => {
        Alert.alert('Próximamente', 'Las notificaciones estarán disponibles en una próxima versión.');
    };

    const renderTx = (tx) => {
        const style = getCategoryStyle(tx.category?.color);
        return (
            <TransactionItem
                key={tx.id}
                icon={tx.category?.icon ?? "payments"}
                label={tx.category?.name ?? "Sin categoría"}
                sub={tx.note ? `${tx.note} • ${formatTime(tx.created_at)}` : formatTime(tx.created_at)}
                amount={formatAmount(tx.amount, tx.type)}
                colorClass={tx.type === 'expense' ? 'text-red-500' : 'text-green-500'}
                iconBg={style.bg}
                iconColor={style.hex}
                onDelete={() => handleDeleteTx(tx)}
            />
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#137fec" colors={['#137fec']} />
                }
            >
                {/* Header */}
                <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
                    <TouchableOpacity onPress={() => router.push('/profile')} className="h-12 w-12 items-center justify-center">
                        {profile?.avatar_url ? (
                            <Image
                                source={{ uri: profile.avatar_url }}
                                className="h-10 w-10 rounded-full border-2 border-primary/20"
                            />
                        ) : (
                            <View className="h-10 w-10 rounded-full bg-primary/20 items-center justify-center border-2 border-primary/20">
                                <Text className="text-primary text-lg font-bold">
                                    {(profile?.full_name ?? '?').charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                    <View className="items-center">
                        <Text className="text-lg font-bold text-slate-900 dark:text-white">
                            Hola, {profile?.full_name?.split(' ')[0] ?? 'usuario'}
                        </Text>
                        <Text className="text-xs text-slate-500 font-medium">
                            {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={handleNotifications} className="h-12 w-12 items-center justify-center rounded-lg active:bg-slate-200 dark:active:bg-slate-800">
                        <MaterialIcons name="notifications" size={24} color="#64748b" />
                    </TouchableOpacity>
                </View>

                {/* Per-account Balance */}
                <View className="px-5 py-6">
                    <Text className="text-slate-500 text-sm font-medium mb-3">Balance del mes</Text>
                    {accountStats.map(({ account: acc, monthIncome, monthExpense, todayExpense: tExp, todayIncome: tInc }) => {
                        const balance = monthIncome - monthExpense;
                        const style = getCategoryStyle(acc.color);
                        return (
                            <View key={acc.id} className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-3">
                                <View className="flex-row items-center gap-2.5 mb-2">
                                    <View className={`h-9 w-9 rounded-xl items-center justify-center ${style.bg}`}>
                                        <MaterialIcons name={acc.icon || 'account-balance-wallet'} size={20} color={style.hex} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-sm font-bold text-slate-900 dark:text-white">{acc.name}</Text>
                                        <Text className="text-[10px] text-slate-400 font-medium">{acc.currency}</Text>
                                    </View>
                                    <Text className={`text-2xl font-extrabold ${balance >= 0 ? 'text-primary' : 'text-red-500'}`}>
                                        {balance < 0 ? '-' : ''}{formatCurrency(Math.abs(balance), acc.currency)}
                                    </Text>
                                </View>
                                <View className="flex-row justify-between">
                                    <Text className="text-xs font-semibold text-emerald-500">+{formatCurrency(monthIncome, acc.currency)}</Text>
                                    <Text className="text-xs font-semibold text-rose-500">-{formatCurrency(monthExpense, acc.currency)}</Text>
                                </View>
                                {(tExp > 0 || tInc > 0) && (
                                    <View className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <Text className="text-[10px] text-slate-400 font-medium">
                                            Hoy: {tExp > 0 ? `-${formatCurrency(tExp, acc.currency)}` : ''}{tExp > 0 && tInc > 0 ? '  ·  ' : ''}{tInc > 0 ? `+${formatCurrency(tInc, acc.currency)}` : ''}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>

                {/* Actions */}
                <View className="px-5 py-2 flex-row gap-3 justify-center">
                    <TouchableOpacity
                        onPress={() => router.push({ pathname: '/add-transaction', params: { type: 'expense' } })}
                        className="flex-1 flex-row items-center justify-center gap-2 rounded-xl h-14 bg-primary shadow-lg shadow-primary/20"
                    >
                        <MaterialIcons name="add-circle" size={24} color="white" />
                        <Text className="text-white text-base font-bold">Gasto</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => router.push({ pathname: '/add-transaction', params: { type: 'income' } })}
                        className="flex-1 flex-row items-center justify-center gap-2 rounded-xl h-14 bg-white dark:bg-slate-800 border-2 border-primary/10"
                    >
                        <MaterialIcons name="account-balance-wallet" size={24} color="#137fec" />
                        <Text className="text-primary text-base font-bold">Ingreso</Text>
                    </TouchableOpacity>
                </View>

                {/* Insight Card */}
                {insight && (
                    <View className="px-5 py-6">
                        <View className={`${insight.iconBg.replace('bg-', 'bg-').includes('/') ? '' : 'bg-primary/5'} rounded-xl p-4 flex-row items-center gap-4 border border-slate-100 dark:border-slate-800/50`}>
                            <View className={`${insight.iconBg} p-2 rounded-lg`}>
                                <MaterialIcons name={insight.icon} size={24} color={insight.iconColor} />
                            </View>
                            <Text className="text-sm text-slate-700 dark:text-slate-300 flex-1">
                                {insight.boldPrefix && <Text className="font-bold">{insight.boldPrefix}</Text>}
                                {insight.text}
                                {insight.highlight && <Text className={`${insight.highlightColor} font-bold`}>{insight.highlight}</Text>}
                                {insight.suffix ?? ''}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Pending Recurring Expenses Banner */}
                {pendingRecurringCount > 0 && (
                    <View className="px-5 pb-2">
                        <TouchableOpacity
                            onPress={() => router.push('/recurring')}
                            className="flex-row items-center gap-3 bg-primary/5 dark:bg-primary/10 rounded-xl p-4 border border-primary/20"
                        >
                            <View className="bg-primary/20 p-1.5 rounded-lg">
                                <MaterialIcons name="repeat" size={18} color="#137fec" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-sm font-bold text-slate-900 dark:text-white">Gastos recurrentes</Text>
                                <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {pendingRecurringCount} pendiente{pendingRecurringCount !== 1 ? 's' : ''} de confirmar este mes
                                </Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={20} color="#137fec" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Weekly Review Alert — visible on Mondays when categories are at risk */}
                {weeklyAlert.visible && weeklyAlert.summary && (
                    <View className="px-5 pb-2">
                        <View className={`rounded-xl p-4 border ${weeklyAlert.summary.criticaCount > 0 ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-900/30' : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-900/30'}`}>
                            <View className="flex-row items-start gap-3">
                                <View className={`p-1.5 rounded-lg mt-0.5 ${weeklyAlert.summary.criticaCount > 0 ? 'bg-red-100 dark:bg-red-500/20' : 'bg-amber-100 dark:bg-amber-500/20'}`}>
                                    <MaterialIcons
                                        name={weeklyAlert.summary.criticaCount > 0 ? 'error' : 'warning'}
                                        size={18}
                                        color={weeklyAlert.summary.criticaCount > 0 ? '#ef4444' : '#f59e0b'}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm font-bold text-slate-900 dark:text-white">Revisión semanal</Text>
                                    <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {[
                                            weeklyAlert.summary.criticaCount > 0 && `${weeklyAlert.summary.criticaCount} crítica${weeklyAlert.summary.criticaCount !== 1 ? 's' : ''}`,
                                            weeklyAlert.summary.enRiesgoCount > 0 && `${weeklyAlert.summary.enRiesgoCount} en riesgo`,
                                        ].filter(Boolean).join(' · ')}
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => { weeklyAlert.dismiss(); router.push('/planning'); }}
                                        className="mt-2 self-start"
                                    >
                                        <Text className={`text-xs font-bold ${weeklyAlert.summary.criticaCount > 0 ? 'text-red-500' : 'text-amber-600'}`}>
                                            Ver planificación →
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity
                                    onPress={weeklyAlert.dismiss}
                                    className="h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
                                >
                                    <MaterialIcons name="close" size={16} color="#64748b" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}

                {/* Error State */}
                {error && (
                    <View className="px-5 py-4">
                        <View className="bg-red-500/10 rounded-xl p-4 flex-row items-center gap-3 border border-red-200 dark:border-red-900/30">
                            <MaterialIcons name="error-outline" size={24} color="#ef4444" />
                            <Text className="text-red-500 text-sm flex-1 font-medium">{error}</Text>
                            <TouchableOpacity onPress={onRefresh}>
                                <Text className="text-primary font-bold text-sm">Reintentar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Transactions List */}
                <View className="px-5 flex-1">
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-lg font-bold text-slate-900 dark:text-white">Actividad de hoy</Text>
                        <TouchableOpacity onPress={() => router.push('/all-transactions')}>
                            <Text className="text-primary text-sm font-bold">Ver todo</Text>
                        </TouchableOpacity>
                    </View>

                    {loading && !refreshing && <ActivityIndicator color="#137fec" style={{ marginVertical: 20 }} />}

                    {!loading && todayTx.length === 0 && !error && (
                        <View className="items-center py-6">
                            <MaterialIcons name="receipt-long" size={40} color="#94a3b8" />
                            <Text className="text-slate-400 text-sm text-center mt-2">Sin movimientos hoy</Text>
                            <Text className="text-slate-400 text-xs text-center mt-1">Registrá tu primer gasto o ingreso</Text>
                        </View>
                    )}

                    {todayTx.map(renderTx)}

                    {yesterdayTx.length > 0 && (
                        <>
                            <View className="pt-4 flex-row items-center justify-between mb-4">
                                <Text className="text-lg font-bold text-slate-900 dark:text-white">Ayer</Text>
                            </View>
                            {yesterdayTx.map(renderTx)}
                        </>
                    )}
                </View>
            </ScrollView>
            <ConfirmModal
                visible={!!deleteTx}
                title="Eliminar transacción"
                message={deleteTx ? `¿Eliminar "${deleteTx.category?.name ?? 'Sin categoría'}" por ${formatCurrency(deleteTx.amount)}?` : ''}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTx(null)}
            />
        </SafeAreaView>
    );
}
