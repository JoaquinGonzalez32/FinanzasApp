import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState, useCallback } from 'react';
import TransactionItem from '../components/TransactionItem';
import ConfirmModal from '../components/ConfirmModal';
import { useTransactions } from '../src/hooks/useTransactions';
import { useAccounts } from '../src/hooks/useAccounts';
import { deleteTransaction } from '../src/services/transactionsService';
import { emitTransactionsChange } from '../src/lib/events';
import { formatAmount, formatCurrency, getCategoryStyle, formatTime, sumByType, MONTHS_ES, DAYS_ES } from '../src/lib/helpers';

function formatDateLabel(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dayName = DAYS_ES[date.getDay()];
    const monthName = MONTHS_ES[m - 1];
    return `${dayName} ${d} de ${monthName}`;
}

export default function AllTransactionsScreen() {
    const router = useRouter();
    const { transactions: monthTx, loading, error, refresh } = useTransactions({ mode: 'month' });
    const { accounts } = useAccounts();
    const [refreshing, setRefreshing] = useState(false);
    const [deleteTx, setDeleteTx] = useState(null);

    const accMap = useMemo(() => {
        const m = {};
        accounts.forEach(a => { m[a.id] = a.currency; });
        return m;
    }, [accounts]);
    const txCurrency = (tx) => accMap[tx.account_id ?? tx.category?.account_id] ?? undefined;

    const now = new Date();
    const monthLabel = `${MONTHS_ES[now.getMonth()]} ${now.getFullYear()}`;

    const totalIncome = useMemo(() => sumByType(monthTx, 'income'), [monthTx]);
    const totalExpense = useMemo(() => sumByType(monthTx, 'expense'), [monthTx]);

    const grouped = useMemo(() => {
        const map = {};
        for (const tx of monthTx) {
            if (!map[tx.date]) map[tx.date] = [];
            map[tx.date].push(tx);
        }
        return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
    }, [monthTx]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try { await refresh(); } finally { setRefreshing(false); }
    }, [refresh]);

    const handleEditTx = (tx) => {
        router.push({
            pathname: '/add-transaction',
            params: {
                type: tx.type,
                editId: tx.id,
                editAmount: String(tx.amount),
                editCategoryId: tx.category_id || '',
                editAccountId: tx.account_id || '',
                editNote: tx.note || '',
                editDate: tx.date,
            },
        });
    };

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

    const renderTx = (tx) => {
        const style = getCategoryStyle(tx.category?.color);
        return (
            <TransactionItem
                key={tx.id}
                icon={tx.category?.icon ?? "payments"}
                label={tx.category?.name ?? "Sin categoría"}
                sub={tx.note ? `${tx.note} • ${formatTime(tx.created_at)}` : formatTime(tx.created_at)}
                amount={formatAmount(tx.amount, tx.type, txCurrency(tx))}
                colorClass={tx.type === 'expense' ? 'text-red-500' : 'text-green-500'}
                iconBg={style.bg}
                iconColor={style.hex}
                onPress={() => handleEditTx(tx)}
                onDelete={() => handleDeleteTx(tx)}
            />
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="flex-row items-center px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-lg active:bg-slate-200 dark:active:bg-slate-800">
                    <MaterialIcons name="arrow-back" size={24} color="#64748b" />
                </TouchableOpacity>
                <Text className="flex-1 text-center text-lg font-bold text-slate-900 dark:text-white">{monthLabel}</Text>
                <View className="w-10" />
            </View>

            {/* Summary */}
            <View className="flex-row px-5 py-4 gap-3">
                <View className="flex-1 bg-green-500/10 rounded-xl p-3 border border-green-200 dark:border-green-900/30">
                    <Text className="text-xs text-green-600 dark:text-green-400 font-medium">Ingresos</Text>
                    <Text className="text-lg font-extrabold text-green-500 mt-1">+{formatCurrency(totalIncome)}</Text>
                </View>
                <View className="flex-1 bg-red-500/10 rounded-xl p-3 border border-red-200 dark:border-red-900/30">
                    <Text className="text-xs text-red-600 dark:text-red-400 font-medium">Egresos</Text>
                    <Text className="text-lg font-extrabold text-red-500 mt-1">-{formatCurrency(totalExpense)}</Text>
                </View>
            </View>

            <ScrollView
                className="flex-1 px-5"
                contentContainerStyle={{ paddingBottom: 40 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#137fec" colors={['#137fec']} />
                }
            >
                {loading && !refreshing && <ActivityIndicator color="#137fec" style={{ marginVertical: 20 }} />}

                {error && (
                    <View className="bg-red-500/10 rounded-xl p-4 flex-row items-center gap-3 border border-red-200 dark:border-red-900/30 mb-4">
                        <MaterialIcons name="error-outline" size={24} color="#ef4444" />
                        <Text className="text-red-500 text-sm flex-1 font-medium">{error}</Text>
                        <TouchableOpacity onPress={onRefresh}>
                            <Text className="text-primary font-bold text-sm">Reintentar</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {!loading && monthTx.length === 0 && !error && (
                    <View className="items-center py-12">
                        <MaterialIcons name="receipt-long" size={48} color="#94a3b8" />
                        <Text className="text-slate-400 text-sm text-center mt-3">Sin movimientos este mes</Text>
                    </View>
                )}

                {grouped.map(([date, txs]) => {
                    const dayExpense = sumByType(txs, 'expense');
                    const dayIncome = sumByType(txs, 'income');
                    return (
                        <View key={date} className="mb-2">
                            <View className="flex-row items-center justify-between mb-3 mt-2">
                                <Text className="text-sm font-bold text-slate-900 dark:text-white">{formatDateLabel(date)}</Text>
                                <View className="flex-row gap-3">
                                    {dayIncome > 0 && (
                                        <Text className="text-xs font-bold text-green-500">+{formatCurrency(dayIncome)}</Text>
                                    )}
                                    {dayExpense > 0 && (
                                        <Text className="text-xs font-bold text-red-500">-{formatCurrency(dayExpense)}</Text>
                                    )}
                                </View>
                            </View>
                            {txs.map(renderTx)}
                        </View>
                    );
                })}
            </ScrollView>
            <ConfirmModal
                visible={!!deleteTx}
                title="Eliminar transacción"
                message={deleteTx ? `¿Eliminar "${deleteTx.category?.name ?? 'Sin categoría'}" por ${formatCurrency(deleteTx.amount, txCurrency(deleteTx))}?` : ''}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTx(null)}
            />
        </SafeAreaView>
    );
}
