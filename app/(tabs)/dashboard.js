import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, LayoutAnimation, Platform, UIManager } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState, useCallback } from 'react';
import TransactionItem from '../../components/TransactionItem';
import ConfirmModal from '../../components/ConfirmModal';
import { useTransactions } from '../../src/hooks/useTransactions';
import { useAccounts } from '../../src/hooks/useAccounts';
import { useBudget } from '../../src/hooks/useBudget';
import { deleteTransaction } from '../../src/services/transactionsService';
import { emitTransactionsChange } from '../../src/lib/events';
import { formatCurrency, formatTime, getCategoryStyle, sumByType, groupByCategory, MONTHS_ES } from '../../src/lib/helpers';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function DashboardScreen() {
    const router = useRouter();
    const { transactions: monthTx, loading } = useTransactions({ mode: 'month' });
    const { accounts } = useAccounts();

    const now = new Date();
    const monthLabel = `${MONTHS_ES[now.getMonth()]} ${now.getFullYear()}`;

    const monthIncome = useMemo(() => sumByType(monthTx, 'income'), [monthTx]);
    const monthExpense = useMemo(() => sumByType(monthTx, 'expense'), [monthTx]);
    const netBalance = monthIncome - monthExpense;
    const expenseTx = useMemo(() => monthTx.filter(t => t.type === 'expense'), [monthTx]);
    const topCats = useMemo(() => groupByCategory(expenseTx), [expenseTx]);
    const accountStats = useMemo(() => accounts.map(acc => {
        const linkedTx = monthTx.filter(t => (t.account_id ?? t.category?.account_id) === acc.id);
        return {
            account: acc,
            monthIncome: sumByType(linkedTx, 'income'),
            monthExpense: sumByType(linkedTx, 'expense'),
        };
    }), [accounts, monthTx]);

    const { budgetItems } = useBudget();

    const [expandedCatId, setExpandedCatId] = useState(null);
    const [deleteTx, setDeleteTx] = useState(null);
    const [selectedAccountId, setSelectedAccountId] = useState(null);

    // Budget items filtered by selected account
    const filteredBudgetItems = useMemo(() => {
        if (!selectedAccountId) return budgetItems;
        return budgetItems.filter(b => !b.account_id || b.account_id === selectedAccountId);
    }, [budgetItems, selectedAccountId]);

    // Income for the selected account (used for distribution targets)
    const distributionIncome = useMemo(() => {
        if (!selectedAccountId) return monthIncome;
        const stat = accountStats.find(s => s.account.id === selectedAccountId);
        return stat ? stat.monthIncome : 0;
    }, [selectedAccountId, monthIncome, accountStats]);

    const toggleCategory = useCallback((catId) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedCatId(prev => prev === catId ? null : catId);
    }, []);

    const getTxForCategory = useCallback((catId) => {
        return expenseTx.filter(t => t.category?.id === catId);
    }, [expenseTx]);

    const handleDeleteTx = useCallback((tx) => setDeleteTx(tx), []);

    const confirmDelete = useCallback(async () => {
        if (!deleteTx) return;
        try {
            await deleteTransaction(deleteTx.id);
            emitTransactionsChange();
        } catch (e) {
            console.log('Delete error:', e.message);
        } finally {
            setDeleteTx(null);
        }
    }, [deleteTx]);

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="absolute top-0 left-0 right-0 z-50 px-4 pt-12 pb-4 bg-background-light/80 dark:bg-background-dark/80">
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                        <View className="p-2 bg-primary/10 rounded-xl">
                            <MaterialIcons name="dashboard" size={24} color="#137fec" />
                        </View>
                        <View>
                            <Text className="text-xl font-bold text-slate-900 dark:text-white mt-1">Dashboard</Text>
                            <Text className="text-xs text-slate-500 font-medium">{monthLabel}</Text>
                        </View>
                    </View>
                    <View className="flex-row gap-2">
                        <TouchableOpacity className="p-2 rounded-full active:bg-slate-200 dark:active:bg-slate-800">
                            <MaterialIcons name="calendar-today" size={24} color="#64748b" />
                        </TouchableOpacity>
                        <TouchableOpacity className="p-2 rounded-full active:bg-slate-200 dark:active:bg-slate-800 relative">
                            <MaterialIcons name="notifications" size={24} color="#64748b" />
                            <View className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-background-light dark:border-background-dark" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: 100, paddingBottom: 100 }}>
                <View className="px-4 space-y-6">
                    {/* Main Balance Card */}
                    <View className="bg-primary p-6 rounded-2xl shadow-xl shadow-primary/20 flex-col justify-between mt-2">
                        <View>
                            <Text className="text-white/80 text-sm font-medium mb-1">Balance Neto</Text>
                            <Text className="text-white text-4xl font-extrabold">{formatCurrency(netBalance)}</Text>
                        </View>
                    </View>

                    {/* Account Cards */}
                    {accountStats.length > 0 && (
                        <View>
                            <Text className="text-lg font-bold text-slate-900 dark:text-white mb-3">Cuentas</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                                {accountStats.map(({ account: acc, monthIncome: accIncome, monthExpense: accExpense }) => {
                                    const style = getCategoryStyle(acc.color);
                                    const isSelected = selectedAccountId === acc.id;
                                    return (
                                        <TouchableOpacity
                                            key={acc.id}
                                            onPress={() => setSelectedAccountId(prev => prev === acc.id ? null : acc.id)}
                                            activeOpacity={0.8}
                                            className={`p-4 rounded-2xl border ${isSelected ? 'bg-primary/5 dark:bg-primary/10 border-primary/30' : 'bg-white dark:bg-card-dark border-slate-200 dark:border-slate-800'}`}
                                            style={{ width: 180 }}
                                        >
                                            <View className="flex-row items-center gap-2 mb-3">
                                                <View className={`h-8 w-8 rounded-lg items-center justify-center ${style.bg}`}>
                                                    <MaterialIcons name={acc.icon || 'account-balance-wallet'} size={18} color={style.hex} />
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>{acc.name}</Text>
                                                    <Text className="text-[10px] text-slate-400 font-medium">{acc.currency}</Text>
                                                </View>
                                                {isSelected && <MaterialIcons name="check-circle" size={18} color="#137fec" />}
                                            </View>
                                            <Text className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">{formatCurrency(acc.balance)}</Text>
                                            <View className="flex-row justify-between">
                                                <Text className="text-xs font-semibold text-emerald-500">+{formatCurrency(accIncome)}</Text>
                                                <Text className="text-xs font-semibold text-rose-500">-{formatCurrency(accExpense)}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}

                    {/* Income/Expense Cards */}
                    <View className="flex-row gap-4">
                        <View className="flex-1 bg-white dark:bg-card-dark p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <View className="flex-row items-center gap-2 mb-3">
                                <View className="h-8 w-8 rounded-lg bg-emerald-500/10 items-center justify-center">
                                    <MaterialIcons name="arrow-downward" size={20} color="#10b981" />
                                </View>
                                <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ingresos</Text>
                            </View>
                            <Text className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(monthIncome)}</Text>
                        </View>
                        <View className="flex-1 bg-white dark:bg-card-dark p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <View className="flex-row items-center gap-2 mb-3">
                                <View className="h-8 w-8 rounded-lg bg-rose-500/10 items-center justify-center">
                                    <MaterialIcons name="arrow-upward" size={20} color="#f43f5e" />
                                </View>
                                <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gastos</Text>
                            </View>
                            <Text className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(monthExpense)}</Text>
                        </View>
                    </View>

                    {/* Distribution Section */}
                    <View className="space-y-4">
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-2">
                                <Text className="text-lg font-bold text-slate-900 dark:text-white">Distribución del Ingreso</Text>
                                {selectedAccountId && (
                                    <TouchableOpacity onPress={() => setSelectedAccountId(null)} className="bg-primary/10 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                                        <Text className="text-[10px] font-bold text-primary">{accounts.find(a => a.id === selectedAccountId)?.name}</Text>
                                        <MaterialIcons name="close" size={12} color="#137fec" />
                                    </TouchableOpacity>
                                )}
                            </View>
                            <TouchableOpacity onPress={() => router.push('/planning')}>
                                <Text className="text-xs font-semibold text-primary">Ver metas</Text>
                            </TouchableOpacity>
                        </View>
                        {filteredBudgetItems.length > 0 ? (
                            <View className="bg-white dark:bg-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5">
                                {filteredBudgetItems.map(item => {
                                    const cat = item.category;
                                    const style = getCategoryStyle(cat?.color);
                                    const target = distributionIncome * Number(item.percentage) / 100;
                                    const catSpending = cat ? topCats.find(tc => tc.category.id === cat.id) : null;
                                    const spent = catSpending ? catSpending.total : 0;
                                    const progressPct = target > 0 ? Math.min((spent / target) * 100, 100) : 0;
                                    const isOver = spent > target && target > 0;
                                    return (
                                        <View key={item.id} className="space-y-2">
                                            <View className="flex-row items-center gap-2 mb-1">
                                                <View className={`h-7 w-7 rounded-lg items-center justify-center ${style.bg}`}>
                                                    <MaterialIcons name={cat?.icon || 'category'} size={16} color={style.hex} />
                                                </View>
                                                <Text className="flex-1 text-sm font-bold text-slate-900 dark:text-white">{cat?.name || 'Sin categoría'}</Text>
                                                <View className="items-end">
                                                    <Text className={`text-sm font-bold ${isOver ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                                                        {formatCurrency(spent)} <Text className="text-slate-400 font-normal text-xs">/ {formatCurrency(target)}</Text>
                                                    </Text>
                                                </View>
                                            </View>
                                            <View className="relative h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <View className="absolute top-0 left-0 h-full rounded-full" style={{ width: `${progressPct}%`, backgroundColor: isOver ? '#f43f5e' : style.hex }} />
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        ) : (
                            <TouchableOpacity onPress={() => router.push('/planning')} className="bg-white dark:bg-card-dark p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 items-center">
                                <MaterialIcons name="pie-chart-outline" size={32} color="#94a3b8" />
                                <Text className="text-slate-400 text-sm font-medium mt-2">{selectedAccountId ? 'Sin distribución para esta cuenta' : 'Configura tu distribución'}</Text>
                                <Text className="text-primary text-xs font-bold mt-1">Ir a Planificación</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Top Categories */}
                    <View className="space-y-4">
                        <Text className="text-lg font-bold text-slate-900 dark:text-white">Top Categorías</Text>
                        {loading && <ActivityIndicator color="#137fec" />}
                        <View>
                            {topCats.slice(0, 5).map(item => {
                                const style = getCategoryStyle(item.category.color);
                                const isExpanded = expandedCatId === item.category.id;
                                const catTx = isExpanded ? getTxForCategory(item.category.id) : [];
                                return (
                                    <View key={item.category.id}>
                                        <TransactionItem
                                            icon={item.category.icon}
                                            label={item.category.name}
                                            sub={`${item.count} ${item.count === 1 ? 'transacción' : 'transacciones'}`}
                                            amount={formatCurrency(item.total)}
                                            colorClass="text-slate-900 dark:text-white"
                                            iconBg={style.bg}
                                            iconColor={style.hex}
                                            onPress={() => toggleCategory(item.category.id)}
                                        />
                                        {isExpanded && (
                                            <View className="ml-6 mb-3 border-l-2 border-slate-200 dark:border-slate-700 pl-3">
                                                {catTx.map(tx => {
                                                    const txStyle = getCategoryStyle(tx.category?.color);
                                                    return (
                                                        <View
                                                            key={tx.id}
                                                            className="flex-row items-center gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800/40"
                                                        >
                                                            <View className={`h-8 w-8 rounded-lg ${txStyle.bg} items-center justify-center`}>
                                                                <MaterialIcons name={tx.category?.icon ?? 'payments'} size={16} color={txStyle.hex} />
                                                            </View>
                                                            <View className="flex-1">
                                                                <Text className="text-sm font-semibold text-slate-900 dark:text-white">
                                                                    {tx.note || tx.category?.name || 'Sin nota'}
                                                                </Text>
                                                                <Text className="text-xs text-slate-500">
                                                                    {tx.date} • {formatTime(tx.created_at)}
                                                                </Text>
                                                            </View>
                                                            <Text className="text-sm font-bold text-red-500 mr-1">
                                                                -{formatCurrency(tx.amount)}
                                                            </Text>
                                                            <TouchableOpacity onPress={() => handleDeleteTx(tx)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} className="p-1.5 rounded-full active:bg-red-100 dark:active:bg-red-500/20">
                                                                <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
                                                            </TouchableOpacity>
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                            {!loading && topCats.length === 0 && (
                                <Text className="text-slate-400 text-sm text-center py-4">Sin datos este mes</Text>
                            )}
                        </View>
                    </View>
                </View>
            </ScrollView>
            <ConfirmModal
                visible={!!deleteTx}
                title="Eliminar transacción"
                message={deleteTx ? `¿Eliminar "${deleteTx.note || deleteTx.category?.name || 'Sin categoría'}" por ${formatCurrency(deleteTx.amount)}?` : ''}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTx(null)}
            />
        </View>
    );
}
