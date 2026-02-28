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
    formatCurrency, getCategoryStyle, sumByType, MONTHS_ES,
    getCurrentMonth, parseMonth, shiftMonth, monthLabel,
    getCategoryAssignments, getAssignedTotal,
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

// Transitions from category color → amber → red as spending approaches/exceeds limit
function barColor(pct, hex) {
    if (pct >= 100) return '#ef4444';
    if (pct >= 85)  return '#f97316';
    if (pct >= 65)  return '#fbbf24';
    return hex;
}

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

    // ── Planning state ─────────────────────────────────────────
    const [distMonth, setDistMonth] = useState(getCurrentMonth);
    const { year: distYear, month: distMo } = parseMonth(distMonth);
    const { transactions: distMonthTx, loading: distTxLoading } = useTransactions({ mode: 'month', year: distYear, month: distMo });
    const { budgetItems: distBudgetItems, loading: distBudgetLoading } = useBudget(distMonth);
    const { categories: expenseCategories } = useCategories('expense');

    const [assignments, setAssignments] = useState([]);
    const [removedIds, setRemovedIds] = useState([]);
    const [saving, setSaving] = useState(false);
    const [editVisible, setEditVisible] = useState(false);
    const [pickerVisible, setPickerVisible] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Reset when switching months
    useEffect(() => {
        setIsDirty(false);
        setAssignments([]);
        setRemovedIds([]);
    }, [distMonth]);

    // Sync DB → local assignments (only when no unsaved edits)
    useEffect(() => {
        if (!distBudgetLoading && !isDirty) {
            setAssignments(distBudgetItems.length > 0 ? getCategoryAssignments(distBudgetItems) : []);
            setRemovedIds([]);
        }
    }, [distBudgetLoading, distBudgetItems, isDirty]);

    // Actual expenses per category for the selected month
    const actualByCategory = useMemo(() => {
        const map = {};
        for (const t of distMonthTx) {
            if (t.type !== 'expense' || !t.category_id) continue;
            map[t.category_id] = (map[t.category_id] || 0) + Number(t.amount);
        }
        return map;
    }, [distMonthTx]);

    const assignedTotal = useMemo(() => getAssignedTotal(assignments), [assignments]);

    const totalActual = useMemo(
        () => assignments.reduce((sum, a) => sum + (actualByCategory[a.categoryId] || 0), 0),
        [assignments, actualByCategory]
    );

    // Donut slices: planned distribution
    const donutSlices = useMemo(() => {
        if (assignedTotal <= 0) return [];
        return assignments
            .filter(a => a.amount > 0)
            .map(a => ({
                label: a.category?.name || 'Sin categoría',
                amount: a.amount,
                percentage: (a.amount / assignedTotal) * 100,
                color: getCategoryStyle(a.category?.color).hex,
                categoryId: a.categoryId,
            }));
    }, [assignments, assignedTotal]);

    const assignedCategoryIds = useMemo(() => new Set(assignments.map(a => a.categoryId)), [assignments]);
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
        setAssignments(prev => [...prev, {
            budgetItemId: null,
            categoryId: category.id,
            category,
            amount: 0,
            isLocal: true,
        }]);
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
            setEditVisible(false);
            emitBudgetChange();
            if (Platform.OS === 'web') {
                window.alert('Planificación guardada');
            } else {
                Alert.alert('Listo', 'Planificación guardada');
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

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
                <View className="px-5 space-y-6">
                    {/* Balance Neto */}
                    <View className="bg-primary p-6 rounded-2xl shadow-xl shadow-primary/20 mt-2">
                        <Text className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">Balance Neto · Mes</Text>
                        <Text className="text-white text-4xl font-extrabold">{formatCurrency(netBalance)}</Text>
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
                                                    id: acc.id, name: acc.name, type: acc.type,
                                                    icon: acc.icon, color: acc.color,
                                                    balance: String(acc.balance), currency: acc.currency,
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

                    {/* ── Planning Section ──────────────────────── */}
                    <View className="space-y-4">
                        {/* Section header row */}
                        <View className="flex-row items-center justify-between">
                            <Text className="text-lg font-bold text-slate-900 dark:text-white">Planificación de Gastos</Text>
                            <TouchableOpacity
                                onPress={() => setEditVisible(true)}
                                className="h-8 w-8 items-center justify-center rounded-full bg-primary/10"
                            >
                                <MaterialIcons name="edit" size={16} color="#137fec" />
                            </TouchableOpacity>
                        </View>

                        {/* Month navigator */}
                        <View className="flex-row items-center justify-center gap-4">
                            <TouchableOpacity onPress={() => setDistMonth(m => shiftMonth(m, -1))} className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                                <MaterialIcons name="chevron-left" size={22} color="#475569" />
                            </TouchableOpacity>
                            <Text className="text-sm font-bold text-slate-700 dark:text-slate-300 min-w-[140px] text-center">
                                {monthLabel(distMonth)}
                            </Text>
                            <TouchableOpacity onPress={() => setDistMonth(m => shiftMonth(m, 1))} className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                                <MaterialIcons name="chevron-right" size={22} color="#475569" />
                            </TouchableOpacity>
                        </View>

                        {distLoading ? (
                            <View className="items-center py-10">
                                <ActivityIndicator size="large" color="#137fec" />
                            </View>
                        ) : assignments.length === 0 ? (
                            <TouchableOpacity
                                onPress={() => setEditVisible(true)}
                                className="bg-white dark:bg-card-dark p-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 items-center"
                            >
                                <MaterialIcons name="bar-chart" size={36} color="#94a3b8" />
                                <Text className="text-slate-400 text-sm font-medium mt-3">Sin planificación configurada</Text>
                                <Text className="text-primary text-xs font-bold mt-1">Tocar para configurar</Text>
                            </TouchableOpacity>
                        ) : (
                            <>
                                {/* Summary card */}
                                <View className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-800 px-5 py-4">
                                    <View className="flex-row justify-between items-end mb-3">
                                        <View>
                                            <Text className="text-xs font-semibold text-slate-400 mb-0.5">Planificado</Text>
                                            <Text className="text-xl font-extrabold text-primary">{formatCurrency(assignedTotal)}</Text>
                                        </View>
                                        <View className="items-end">
                                            <Text className="text-xs font-semibold text-slate-400 mb-0.5">Gastado</Text>
                                            <Text className={`text-xl font-extrabold ${totalActual > assignedTotal ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                                                {formatCurrency(totalActual)}
                                            </Text>
                                        </View>
                                    </View>
                                    {/* Segmented progress bar: each category's actual spend, colored by proximity to limit */}
                                    <View className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex-row">
                                        {assignments.map((a, idx) => {
                                            const style = getCategoryStyle(a.category?.color);
                                            const actual = actualByCategory[a.categoryId] || 0;
                                            const segPct = assignedTotal > 0 ? (actual / assignedTotal) * 100 : 0;
                                            if (segPct <= 0) return null;
                                            const catPct = a.amount > 0 ? (actual / a.amount) * 100 : 0;
                                            return (
                                                <View
                                                    key={a.budgetItemId || `bar-${idx}`}
                                                    style={{ width: `${Math.min(segPct, 100)}%`, backgroundColor: barColor(catPct, style.hex) }}
                                                    className="h-full"
                                                />
                                            );
                                        })}
                                    </View>
                                </View>

                                {/* Donut + legend */}
                                {donutSlices.length > 0 && (
                                    <View className="bg-white dark:bg-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                                        {/* Donut */}
                                        <View className="items-center mb-6">
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
                                                    <Text className="text-[10px] text-slate-400 font-medium">Planificado</Text>
                                                    <Text className="text-base font-extrabold text-slate-900 dark:text-white">
                                                        {formatCurrency(assignedTotal)}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>

                                        {/* Legend with per-category progress bars */}
                                        <View className="space-y-4">
                                            {donutSlices.map((slice, idx) => {
                                                const actual = actualByCategory[slice.categoryId] || 0;
                                                const catPct = slice.amount > 0 ? Math.min((actual / slice.amount) * 100, 100) : 0;
                                                const color = barColor(catPct, slice.color);
                                                return (
                                                    <View key={idx}>
                                                        <View className="flex-row items-center gap-3 mb-1.5">
                                                            <View className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }} />
                                                            <Text className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300" numberOfLines={1}>
                                                                {slice.label}
                                                            </Text>
                                                            <Text className="text-sm font-bold text-slate-900 dark:text-white">
                                                                {formatCurrency(actual)}<Text className="text-slate-400 font-medium">/{formatCurrency(slice.amount)}</Text>
                                                            </Text>
                                                        </View>
                                                        <View className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden ml-6" style={{ width: '94%' }}>
                                                            <View
                                                                style={{ width: `${catPct}%`, backgroundColor: color }}
                                                                className="h-full rounded-full"
                                                            />
                                                        </View>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* ── Edit Planning Bottom Sheet ─────────────────── */}
            <Modal visible={editVisible} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-background-light dark:bg-modal-dark rounded-t-3xl" style={{ maxHeight: '82%' }}>
                        {/* Handle */}
                        <View className="items-center pt-3 pb-1">
                            <View className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
                        </View>
                        {/* Header */}
                        <View className="flex-row items-center justify-between px-5 pt-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                            <Text className="text-lg font-bold text-slate-900 dark:text-white">Editar Planificación</Text>
                            <TouchableOpacity
                                onPress={() => setEditVisible(false)}
                                className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
                            >
                                <MaterialIcons name="close" size={20} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="px-5" contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
                            <View className="space-y-3">
                                {assignments.map((a, idx) => {
                                    const style = getCategoryStyle(a.category?.color);
                                    return (
                                        <View key={a.budgetItemId || `local-${idx}`} className="flex-row items-center gap-3 bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-800 px-4 py-3">
                                            <View className={`h-9 w-9 rounded-xl items-center justify-center ${style.bg}`}>
                                                <MaterialIcons name={a.category?.icon || 'category'} size={20} color={style.hex} />
                                            </View>
                                            <Text className="flex-1 text-sm font-semibold text-slate-900 dark:text-white" numberOfLines={1}>
                                                {a.category?.name || 'Sin categoría'}
                                            </Text>
                                            <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-lg px-2">
                                                <Text className="text-slate-400 font-bold text-sm">$</Text>
                                                <TextInput
                                                    value={a.amount > 0 ? String(a.amount) : ''}
                                                    onChangeText={(v) => updateAmount(idx, v)}
                                                    keyboardType="numeric"
                                                    placeholder="0"
                                                    placeholderTextColor="#94a3b8"
                                                    className="w-20 h-9 text-center text-sm font-bold text-slate-900 dark:text-white"
                                                />
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => removeAssignment(idx)}
                                                className="h-7 w-7 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10"
                                            >
                                                <MaterialIcons name="close" size={16} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}
                            </View>

                            {/* Add category */}
                            <TouchableOpacity
                                onPress={() => setPickerVisible(true)}
                                disabled={availableCategories.length === 0}
                                className={`flex-row items-center justify-center gap-2 mt-4 py-3 rounded-xl border border-dashed ${availableCategories.length > 0 ? 'border-primary/40 bg-primary/5 dark:bg-primary/10' : 'border-slate-200 dark:border-slate-700'}`}
                            >
                                <MaterialIcons name="add" size={18} color={availableCategories.length > 0 ? '#137fec' : '#94a3b8'} />
                                <Text className={`text-sm font-bold ${availableCategories.length > 0 ? 'text-primary' : 'text-slate-400'}`}>
                                    Agregar categoría
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>

                        {/* Save */}
                        {isDirty && (
                            <View className="px-5 pt-3 pb-2 border-t border-slate-100 dark:border-slate-800">
                                <TouchableOpacity
                                    onPress={handleSave}
                                    disabled={saving}
                                    className={`w-full py-3.5 rounded-xl ${saving ? 'bg-slate-300 dark:bg-slate-700' : 'bg-primary'}`}
                                >
                                    {saving ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text className="font-bold text-center text-base text-white">Guardar</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                        <SafeAreaView edges={['bottom']} />
                    </View>
                </View>
            </Modal>

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
