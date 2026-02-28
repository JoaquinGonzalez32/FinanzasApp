import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Modal, Platform, ActivityIndicator, useColorScheme } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState, useEffect, useCallback } from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
import { useTransactions } from '../../src/hooks/useTransactions';
import { useAccounts } from '../../src/hooks/useAccounts';
import { useBudget } from '../../src/hooks/useBudget';
import { useCategories } from '../../src/hooks/useCategories';
import { emitBudgetChange } from '../../src/lib/events';
import * as budgetSvc from '../../src/services/budgetService';
import {
    formatCurrency, getCategoryStyle, sumByType, groupByCategory, MONTHS_ES,
    getCurrentMonth, parseMonth, shiftMonth, monthLabel,
    getMonthIncomeTotal, getCategoryAssignments, getAssignedTotal, getUnassigned, buildDonutData,
} from '../../src/lib/helpers';

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
    const colorScheme = useColorScheme();
    const { transactions: monthTx } = useTransactions({ mode: 'month' });
    const { accounts } = useAccounts();

    const now = new Date();
    const headerLabel = `${MONTHS_ES[now.getMonth()]} ${now.getFullYear()}`;

    const monthIncome = useMemo(() => sumByType(monthTx, 'income'), [monthTx]);
    const monthExpense = useMemo(() => sumByType(monthTx, 'expense'), [monthTx]);
    const netBalance = monthIncome - monthExpense;
    const accountStats = useMemo(() => accounts.map(acc => {
        const linkedTx = monthTx.filter(t => (t.account_id ?? t.category?.account_id) === acc.id);
        return {
            account: acc,
            monthIncome: sumByType(linkedTx, 'income'),
            monthExpense: sumByType(linkedTx, 'expense'),
        };
    }), [accounts, monthTx]);

    // ── Distribution state ─────────────────────────────────────
    const [distMonth, setDistMonth] = useState(getCurrentMonth);
    const { year: distYear, month: distMo } = parseMonth(distMonth);
    const { transactions: distMonthTx, loading: distTxLoading } = useTransactions({ mode: 'month', year: distYear, month: distMo });
    const { budgetItems: distBudgetItems, loading: distBudgetLoading } = useBudget(distMonth);
    const { categories: expenseCategories } = useCategories('expense');

    const distIncome = useMemo(() => getMonthIncomeTotal(distMonthTx), [distMonthTx]);

    const [assignments, setAssignments] = useState([]);
    const [removedIds, setRemovedIds] = useState([]);
    const [saving, setSaving] = useState(false);
    const [pickerVisible, setPickerVisible] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const [showAccounts, setShowAccounts] = useState(false);

    // Sync DB budget items → local assignments (only when user has no unsaved edits)
    useEffect(() => {
        if (!distBudgetLoading && !isDirty) {
            if (distBudgetItems.length > 0) {
                setAssignments(getCategoryAssignments(distBudgetItems));
            } else {
                setAssignments([]);
            }
            setRemovedIds([]);
        }
    }, [distBudgetLoading, distBudgetItems, isDirty]);

    const assignedTotal = useMemo(() => getAssignedTotal(assignments), [assignments]);
    const unassigned = useMemo(() => getUnassigned(distIncome, assignedTotal), [distIncome, assignedTotal]);
    const isOverBudget = assignedTotal > distIncome && distIncome > 0;
    const donutSlices = useMemo(
        () => buildDonutData(assignments, Math.max(unassigned, 0), distIncome),
        [assignments, unassigned, distIncome]
    );

    const assignedCategoryIds = useMemo(
        () => new Set(assignments.map(a => a.categoryId)),
        [assignments]
    );

    const availableCategories = useMemo(
        () => expenseCategories.filter(c => !assignedCategoryIds.has(c.id)),
        [expenseCategories, assignedCategoryIds]
    );

    const updateAmount = useCallback((idx, value) => {
        const clean = value.replace(/[^0-9]/g, '');
        setIsDirty(true);
        setAssignments(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], amount: Number(clean) || 0 };
            return next;
        });
    }, []);

    const removeAssignment = useCallback((idx) => {
        setIsDirty(true);
        setAssignments(prev => {
            const item = prev[idx];
            if (item.budgetItemId && !item.isLocal) {
                setRemovedIds(r => [...r, item.budgetItemId]);
            }
            return prev.filter((_, i) => i !== idx);
        });
    }, []);

    const addCategory = useCallback((category) => {
        setIsDirty(true);
        setAssignments(prev => [
            ...prev,
            {
                budgetItemId: null,
                categoryId: category.id,
                category: category,
                amount: 0,
                isLocal: true,
            },
        ]);
        setPickerVisible(false);
    }, []);

    const handleSave = useCallback(async () => {
        setSaving(true);
        try {
            for (const id of removedIds) {
                await budgetSvc.deleteBudgetItem(id);
            }
            for (let i = 0; i < assignments.length; i++) {
                const a = assignments[i];
                const payload = {
                    category_id: a.categoryId,
                    account_id: a.account_id ?? null,
                    percentage: a.amount,
                    month: distMonth,
                    sort_order: i,
                };
                if (a.isLocal || !a.budgetItemId) {
                    await budgetSvc.createBudgetItem(payload);
                } else {
                    await budgetSvc.updateBudgetItem(a.budgetItemId, payload);
                }
            }
            setIsDirty(false);
            emitBudgetChange();
            if (Platform.OS === 'web') {
                window.alert('Distribución guardada');
            } else {
                Alert.alert('Listo', 'Distribución guardada');
            }
        } catch (e) {
            if (Platform.OS === 'web') {
                window.alert(e.message || 'No se pudo guardar');
            } else {
                Alert.alert('Error', e.message || 'No se pudo guardar');
            }
        } finally {
            setSaving(false);
        }
    }, [assignments, removedIds, distMonth]);

    const distLoading = distTxLoading || distBudgetLoading;

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
                            <Text className="text-xs text-slate-500 font-medium">{headerLabel}</Text>
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
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
                            <TouchableOpacity
                                onPress={() => setShowAccounts(v => !v)}
                                activeOpacity={0.7}
                                className="flex-row items-center justify-between mb-3"
                            >
                                <Text className="text-lg font-bold text-slate-900 dark:text-white">Cuentas</Text>
                                <MaterialIcons
                                    name={showAccounts ? 'expand-less' : 'expand-more'}
                                    size={24}
                                    color="#94a3b8"
                                />
                            </TouchableOpacity>
                            {showAccounts && (
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
                            )}
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

                    {/* ── Distribution Section ────────────────────────── */}
                    <View className="space-y-4">
                        {/* Header */}
                        <View className="flex-row items-center justify-between">
                            <Text className="text-lg font-bold text-slate-900 dark:text-white">Distribución del Ingreso</Text>
                            <TouchableOpacity
                                onPress={() => setPickerVisible(true)}
                                disabled={availableCategories.length === 0}
                                className={`h-8 w-8 items-center justify-center rounded-full ${availableCategories.length > 0 ? 'bg-primary/10' : 'bg-slate-100 dark:bg-slate-800'}`}
                            >
                                <MaterialIcons name="add" size={20} color={availableCategories.length > 0 ? '#137fec' : '#94a3b8'} />
                            </TouchableOpacity>
                        </View>

                        {/* Month navigator */}
                        <View className="flex-row items-center justify-center gap-4">
                            <TouchableOpacity onPress={() => setDistMonth(m => shiftMonth(m, -1))} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 active:bg-slate-200">
                                <MaterialIcons name="chevron-left" size={24} color="#475569" />
                            </TouchableOpacity>
                            <Text className="text-base font-bold text-slate-900 dark:text-white min-w-[160px] text-center">
                                {monthLabel(distMonth)}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setDistMonth(m => shiftMonth(m, 1))}
                                className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 active:bg-slate-200"
                            >
                                <MaterialIcons name="chevron-right" size={24} color="#475569" />
                            </TouchableOpacity>
                        </View>

                        {/* Income banner */}
                        <View className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 flex-row items-center gap-2">
                            <MaterialIcons name="arrow-downward" size={18} color="#10b981" />
                            <Text className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                Ingreso total del mes: {formatCurrency(distIncome)}
                            </Text>
                        </View>

                        {/* Loading */}
                        {distLoading ? (
                            <View className="items-center py-8">
                                <ActivityIndicator size="large" color="#137fec" />
                            </View>
                        ) : assignments.length === 0 ? (
                            /* Empty state */
                            <TouchableOpacity
                                onPress={() => setPickerVisible(true)}
                                className="bg-white dark:bg-card-dark p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 items-center"
                            >
                                <MaterialIcons name="pie-chart-outline" size={32} color="#94a3b8" />
                                <Text className="text-slate-400 text-sm font-medium mt-2">Sin distribución configurada</Text>
                                <Text className="text-primary text-xs font-bold mt-1">Agregar categoría</Text>
                            </TouchableOpacity>
                        ) : (
                            <>
                                {/* Editable category cards */}
                                <View className="space-y-3">
                                    {assignments.map((a, idx) => {
                                        const style = getCategoryStyle(a.category?.color);
                                        return (
                                            <View key={a.budgetItemId || `local-${idx}`} className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                                                <View className="flex-row items-center gap-3">
                                                    <View className={`h-10 w-10 rounded-xl items-center justify-center ${style.bg}`}>
                                                        <MaterialIcons name={a.category?.icon || 'category'} size={22} color={style.hex} />
                                                    </View>
                                                    <Text className="flex-1 text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                                                        {a.category?.name || 'Sin categoría'}
                                                    </Text>
                                                    <View className="flex-row items-center">
                                                        <Text className="text-slate-400 font-bold text-base mr-1">$</Text>
                                                        <TextInput
                                                            value={a.amount > 0 ? String(a.amount) : ''}
                                                            onChangeText={(v) => updateAmount(idx, v)}
                                                            keyboardType="numeric"
                                                            placeholder="0"
                                                            placeholderTextColor="#94a3b8"
                                                            className="w-24 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg text-center text-base font-bold text-slate-900 dark:text-white"
                                                        />
                                                    </View>
                                                    <TouchableOpacity onPress={() => removeAssignment(idx)} className="h-8 w-8 items-center justify-center rounded-full active:bg-red-100 dark:active:bg-red-500/20 ml-1">
                                                        <MaterialIcons name="close" size={18} color="#ef4444" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>

                                {/* Summary bar */}
                                <View className={`rounded-2xl p-5 border ${isOverBudget ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-300/30' : 'bg-primary/5 dark:bg-primary/10 border-primary/20'}`}>
                                    <View className="flex-row justify-between items-center mb-3">
                                        <View>
                                            <Text className="text-xs font-semibold text-slate-500 mb-0.5">Asignado</Text>
                                            <Text className={`text-lg font-extrabold ${isOverBudget ? 'text-rose-500' : 'text-primary'}`}>
                                                {formatCurrency(assignedTotal)}
                                            </Text>
                                        </View>
                                        <View className="items-end">
                                            <Text className="text-xs font-semibold text-slate-500 mb-0.5">Sin asignar</Text>
                                            <Text className={`text-lg font-extrabold ${unassigned < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                {formatCurrency(Math.abs(unassigned))}
                                            </Text>
                                        </View>
                                    </View>
                                    {isOverBudget && (
                                        <View className="flex-row items-center gap-2 mb-3 bg-rose-100 dark:bg-rose-500/20 rounded-lg px-3 py-2">
                                            <MaterialIcons name="error-outline" size={16} color="#ef4444" />
                                            <Text className="text-xs font-bold text-rose-500 flex-1">
                                                Te pasaste por {formatCurrency(assignedTotal - distIncome)}
                                            </Text>
                                        </View>
                                    )}
                                    {distIncome > 0 && (
                                        <View className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex-row">
                                            {assignments.map((a, idx) => {
                                                const style = getCategoryStyle(a.category?.color);
                                                const pct = (a.amount / distIncome) * 100;
                                                if (pct <= 0) return null;
                                                return (
                                                    <View
                                                        key={a.budgetItemId || `bar-${idx}`}
                                                        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: style.hex }}
                                                        className="h-full"
                                                    />
                                                );
                                            })}
                                        </View>
                                    )}
                                </View>

                                {/* Donut chart */}
                                {donutSlices.length > 0 && (
                                    <View className="bg-white dark:bg-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                                        <View className="items-center mb-5">
                                            <View style={{ width: 180, height: 180 }}>
                                                <Svg width={180} height={180} viewBox="0 0 200 200">
                                                    {(() => {
                                                        let angle = 0;
                                                        return donutSlices.map((slice, idx) => {
                                                            const sweep = (slice.percentage / 100) * 360;
                                                            const path = createSlicePath(100, 100, 90, angle, angle + sweep);
                                                            angle += sweep;
                                                            return <Path key={idx} d={path} fill={slice.color} />;
                                                        });
                                                    })()}
                                                    <Circle cx={100} cy={100} r={55} fill={colorScheme === 'dark' ? '#1c2632' : '#ffffff'} />
                                                </Svg>
                                                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                                                    <Text className="text-[10px] text-slate-400 font-medium">Ingreso</Text>
                                                    <Text className="text-base font-extrabold text-slate-900 dark:text-white">
                                                        {formatCurrency(distIncome)}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                        <View className="space-y-3">
                                            {donutSlices.map((slice, idx) => (
                                                <View key={idx} className="flex-row items-center gap-3">
                                                    <View className="h-3 w-3 rounded-full" style={{ backgroundColor: slice.color }} />
                                                    <Text className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300" numberOfLines={1}>
                                                        {slice.label}
                                                    </Text>
                                                    <Text className="text-sm font-bold text-slate-900 dark:text-white">{slice.percentage.toFixed(1)}%</Text>
                                                    <Text className="text-xs text-slate-400 ml-1">{formatCurrency(slice.amount)}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                {/* Save button — only when user has made changes */}
                                {isDirty && (
                                    <TouchableOpacity
                                        onPress={handleSave}
                                        disabled={saving || isOverBudget}
                                        className={`w-full py-4 rounded-xl shadow-lg shadow-primary/20 active:scale-95 ${saving || isOverBudget ? 'bg-slate-300 dark:bg-slate-700' : 'bg-primary'}`}
                                    >
                                        {saving ? (
                                            <ActivityIndicator color="white" />
                                        ) : (
                                            <Text className={`font-bold text-center text-lg ${saving || isOverBudget ? 'text-slate-500' : 'text-white'}`}>
                                                Guardar Distribución
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* Category Picker Modal */}
            <Modal visible={pickerVisible} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-background-light dark:bg-background-dark rounded-t-3xl max-h-[70%]">
                        <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
                            <Text className="text-lg font-bold text-slate-900 dark:text-white">Seleccionar categoría</Text>
                            <TouchableOpacity onPress={() => setPickerVisible(false)} className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                                <MaterialIcons name="close" size={20} color="#64748b" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView className="px-5 pb-8">
                            {availableCategories.length === 0 ? (
                                <View className="items-center py-8">
                                    <MaterialIcons name="check-circle" size={40} color="#10b981" />
                                    <Text className="text-slate-400 text-sm font-medium mt-3">Todas las categorías ya están asignadas</Text>
                                </View>
                            ) : (
                                <View className="space-y-2 pb-8">
                                    {availableCategories.map(cat => {
                                        const style = getCategoryStyle(cat.color);
                                        return (
                                            <TouchableOpacity
                                                key={cat.id}
                                                onPress={() => addCategory(cat)}
                                                className="flex-row items-center gap-3 p-4 bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-800 active:bg-slate-50 dark:active:bg-slate-800"
                                            >
                                                <View className={`h-10 w-10 rounded-xl items-center justify-center ${style.bg}`}>
                                                    <MaterialIcons name={cat.icon} size={22} color={style.hex} />
                                                </View>
                                                <Text className="flex-1 text-sm font-bold text-slate-900 dark:text-white">{cat.name}</Text>
                                                <MaterialIcons name="add-circle-outline" size={22} color="#94a3b8" />
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}
                        </ScrollView>
                        <SafeAreaView edges={['bottom']} />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}
