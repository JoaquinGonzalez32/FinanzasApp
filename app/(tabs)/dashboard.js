import { View, Text, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState } from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTransactions } from '../../src/hooks/useTransactions';
import { useAccounts } from '../../src/hooks/useAccounts';
import { useBudget } from '../../src/hooks/useBudget';
import { formatCurrency, getCategoryStyle, sumByType, groupByCategory, MONTHS_ES } from '../../src/lib/helpers';

const polarToCartesian = (cx, cy, r, deg) => {
    const rad = (deg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const createSlicePath = (cx, cy, r, startDeg, endDeg) => {
    if (endDeg - startDeg >= 359.99) {
        return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
    }
    const s = polarToCartesian(cx, cy, r, startDeg);
    const e = polarToCartesian(cx, cy, r, endDeg);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
};

export default function DashboardScreen() {
    const router = useRouter();
    const { transactions: monthTx } = useTransactions({ mode: 'month' });
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

    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const { budgetItems } = useBudget(currentMonth);

    const [selectedAccountId, setSelectedAccountId] = useState(null);
    const colorScheme = useColorScheme();

    // Budget items filtered by selected account
    const filteredBudgetItems = useMemo(() => {
        if (!selectedAccountId) return budgetItems;
        return budgetItems.filter(b => !b.account_id || b.account_id === selectedAccountId);
    }, [budgetItems, selectedAccountId]);

    // Pie chart data from budget items
    const pieData = useMemo(() => {
        const total = filteredBudgetItems.reduce((s, b) => s + Number(b.percentage), 0);
        if (total <= 0) return [];
        return filteredBudgetItems
            .filter(b => Number(b.percentage) > 0)
            .map(b => ({
                category: b.category,
                amount: Number(b.percentage),
                pct: (Number(b.percentage) / total) * 100,
            }));
    }, [filteredBudgetItems]);

    return (
        <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="px-5 pb-3 pt-1">
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                        <View className="p-2 bg-primary/10 rounded-xl">
                            <MaterialIcons name="dashboard" size={24} color="#137fec" />
                        </View>
                        <View>
                            <Text className="text-xl font-bold text-slate-900 dark:text-white">Dashboard</Text>
                            <Text className="text-xs text-slate-500 font-medium">{monthLabel}</Text>
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
                <View className="px-5 space-y-6">
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
                                    return (
                                        <TouchableOpacity
                                            key={acc.id}
                                            onPress={() => router.push({
                                                pathname: '/account-detail',
                                                params: {
                                                    id: acc.id,
                                                    name: acc.name,
                                                    type: acc.type,
                                                    icon: acc.icon,
                                                    color: acc.color,
                                                    balance: String(acc.balance),
                                                    currency: acc.currency,
                                                },
                                            })}
                                            activeOpacity={0.8}
                                            className="p-4 rounded-2xl border bg-white dark:bg-card-dark border-slate-200 dark:border-slate-800"
                                            style={{ width: 170, minWidth: 160 }}
                                        >
                                            <View className="flex-row items-center gap-2 mb-3">
                                                <View className={`h-8 w-8 rounded-lg items-center justify-center ${style.bg}`}>
                                                    <MaterialIcons name={acc.icon || 'account-balance-wallet'} size={18} color={style.hex} />
                                                </View>
                                                <View className="flex-1">
                                                    <Text className="text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>{acc.name}</Text>
                                                    <Text className="text-[10px] text-slate-400 font-medium">{acc.currency}</Text>
                                                </View>
                                                <MaterialIcons name="chevron-right" size={18} color="#94a3b8" />
                                            </View>
                                            <Text className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">{formatCurrency(acc.balance, acc.currency)}</Text>
                                            <View className="flex-row justify-between">
                                                <Text className="text-xs font-semibold text-emerald-500">+{formatCurrency(accIncome, acc.currency)}</Text>
                                                <Text className="text-xs font-semibold text-rose-500">-{formatCurrency(accExpense, acc.currency)}</Text>
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
                            <Text className="text-lg font-bold text-slate-900 dark:text-white">Distribución del Ingreso</Text>
                            <TouchableOpacity onPress={() => router.push('/planning')}>
                                <Text className="text-xs font-semibold text-primary">Ver metas</Text>
                            </TouchableOpacity>
                        </View>
                        {/* Account filter chips */}
                        {accounts.length > 0 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                <TouchableOpacity
                                    onPress={() => setSelectedAccountId(null)}
                                    className={`flex-row items-center gap-1.5 mr-2 px-3 py-2 rounded-xl ${!selectedAccountId ? 'bg-primary/10 border border-primary/20' : 'bg-slate-100 dark:bg-input-dark'}`}
                                >
                                    <Text className={`text-xs font-bold ${!selectedAccountId ? 'text-primary' : 'text-slate-500 dark:text-slate-400'}`}>Todas</Text>
                                </TouchableOpacity>
                                {accounts.map(acc => {
                                    const isActive = selectedAccountId === acc.id;
                                    return (
                                        <TouchableOpacity
                                            key={acc.id}
                                            onPress={() => setSelectedAccountId(acc.id)}
                                            className={`flex-row items-center gap-1.5 mr-2 px-3 py-2 rounded-xl ${isActive ? 'bg-primary/10 border border-primary/20' : 'bg-slate-100 dark:bg-input-dark'}`}
                                        >
                                            <MaterialIcons name={acc.icon || 'account-balance-wallet'} size={14} color={isActive ? '#137fec' : '#475569'} />
                                            <Text className={`text-xs font-bold ${isActive ? 'text-primary' : 'text-slate-500 dark:text-slate-400'}`}>{acc.name}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        )}
                        {filteredBudgetItems.length > 0 ? (
                            <View className="bg-white dark:bg-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5">
                                {filteredBudgetItems.map(item => {
                                    const cat = item.category;
                                    const style = getCategoryStyle(cat?.color);
                                    const target = Number(item.percentage);
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

                    {/* Distribución por Categoría — Pie Chart */}
                    <View className="space-y-4">
                        <Text className="text-lg font-bold text-slate-900 dark:text-white">Distribución por Categoría</Text>
                        {pieData.length > 0 ? (
                            <View className="bg-white dark:bg-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                                <View className="items-center mb-5">
                                    <View style={{ width: 180, height: 180 }}>
                                        <Svg width={180} height={180} viewBox="0 0 200 200">
                                            {(() => {
                                                let angle = 0;
                                                return pieData.map((item, idx) => {
                                                    const sweep = (item.pct / 100) * 360;
                                                    const path = createSlicePath(100, 100, 90, angle, angle + sweep);
                                                    angle += sweep;
                                                    const s = getCategoryStyle(item.category?.color);
                                                    return <Path key={idx} d={path} fill={s.hex} />;
                                                });
                                            })()}
                                            <Circle cx={100} cy={100} r={55} fill={colorScheme === 'dark' ? '#1c2632' : '#ffffff'} />
                                        </Svg>
                                        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                                            <Text className="text-[10px] text-slate-400 font-medium">Total</Text>
                                            <Text className="text-base font-extrabold text-slate-900 dark:text-white">
                                                {formatCurrency(pieData.reduce((s, d) => s + d.amount, 0))}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                                <View className="space-y-3">
                                    {pieData.map((item, idx) => {
                                        const s = getCategoryStyle(item.category?.color);
                                        return (
                                            <View key={idx} className="flex-row items-center gap-3">
                                                <View className="h-3 w-3 rounded-full" style={{ backgroundColor: s.hex }} />
                                                <Text className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300" numberOfLines={1}>
                                                    {item.category?.name || 'Sin categoría'}
                                                </Text>
                                                <Text className="text-sm font-bold text-slate-900 dark:text-white">{item.pct.toFixed(1)}%</Text>
                                                <Text className="text-xs text-slate-400 ml-1">{formatCurrency(item.amount)}</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        ) : (
                            <TouchableOpacity onPress={() => router.push('/planning')} className="bg-white dark:bg-card-dark p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 items-center">
                                <MaterialIcons name="pie-chart-outline" size={32} color="#94a3b8" />
                                <Text className="text-slate-400 text-sm font-medium mt-2">{selectedAccountId ? 'Sin distribución para esta cuenta' : 'Configura tu distribución'}</Text>
                                <Text className="text-primary text-xs font-bold mt-1">Ir a Planificación</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
