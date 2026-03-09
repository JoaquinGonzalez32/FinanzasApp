/**
 * BUDGET SCREEN — "Como distribuyo mi plata?"
 *
 * LAYOUT:
 * ┌──────────────────────────────┐
 * │  Header: "Presupuesto" · Edit btn │
 * │  Month nav: < Marzo 2026 >        │
 * │  Account chips (horizontal)       │
 * ├──────────────────────────────┤
 * │  Summary Card                     │
 * │  [Assigned] [Spent] [Available]   │
 * │  ▓▓▓▓▓▓▓▓░░ segmented bar        │
 * │  Status badge · Days remaining    │
 * ├──────────────────────────────┤
 * │  CATEGORIES (sorted by urgency)   │
 * │  - Critical first (>100%)         │
 * │  - Warning (80-100%)              │
 * │  - Normal                         │
 * │  [Collapsed: "Sin actividad" group] │
 * └──────────────────────────────┘
 *
 * KEY CHANGES:
 * - Categories sorted by urgency (closest to exceeding first)
 * - 0% usage categories collapsed into "Sin actividad" group
 * - Cleaner card design (white bg, subtle borders)
 * - Edit modal uses BottomSheet component
 */
import { View, Text, ScrollView, TouchableOpacity, TextInput, useColorScheme } from 'react-native';
import { showError } from '../../src/lib/friendlyError';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { StatusBadge, SkeletonLoader, Button, useToast, FadeIn, ScalePress, AnimatedProgressBar, FrostBackground, EmptyState, BottomSheet } from '../../components/ui';
import { useTransactions } from '../../src/hooks/useTransactions';
import { useBudget } from '../../src/hooks/useBudget';
import { useCategories } from '../../src/hooks/useCategories';
import { emitBudgetChange } from '../../src/lib/events';
import * as budgetSvc from '../../src/services/budgetService';
import {
    formatCurrency, getCategoryStyle, getCurrencySymbol, sumByType, MONTHS_ES,
    getCurrentMonth, parseMonth, shiftMonth, monthLabel,
    getCategoryAssignments, getAssignedTotal,
} from '../../src/lib/helpers';
import { useAccountContext } from '../../src/context/AccountContext';
import { useFilteredTransactions } from '../../src/hooks/useFilteredByAccount';
import AccountSwitcher from '../../src/components/AccountSwitcher';

function budgetBarColor(pct) {
    if (pct >= 100) return '#EF4444';
    if (pct >= 85) return '#F59E0B';
    if (pct >= 65) return '#6366F1';
    return '#10B981';
}

function getDaysRemaining() {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return lastDay - now.getDate();
}

export default function DashboardScreen() {
    const router = useRouter();
    const { transactions: allMonthTx } = useTransactions({ mode: 'month' });
    const { selectedAccountId, selectedAccount, accounts, isAllAccounts } = useAccountContext();
    const { show: showToast, ToastComponent } = useToast();

    // Planning state
    const [distMonth, setDistMonth] = useState(getCurrentMonth);
    const { year: distYear, month: distMo } = parseMonth(distMonth);
    const { transactions: rawDistMonthTx, loading: distTxLoading } = useTransactions({ mode: 'month', year: distYear, month: distMo });
    const distMonthTx = useFilteredTransactions(rawDistMonthTx);
    const { budgetItems: distBudgetItems, loading: distBudgetLoading } = useBudget(distMonth);
    const { categories: expenseCategories } = useCategories('expense');

    const [assignments, setAssignments] = useState([]);
    const [removedIds, setRemovedIds] = useState([]);
    const [saving, setSaving] = useState(false);
    const [editVisible, setEditVisible] = useState(false);
    const [pickerVisible, setPickerVisible] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        setIsDirty(false);
        setAssignments([]);
        setRemovedIds([]);
    }, [distMonth]);

    useEffect(() => {
        if (!distBudgetLoading && !isDirty) {
            setAssignments(distBudgetItems.length > 0 ? getCategoryAssignments(distBudgetItems) : []);
            setRemovedIds([]);
        }
    }, [distBudgetLoading, distBudgetItems, isDirty]);

    const visibleAssignments = useMemo(
        () => isAllAccounts
            ? assignments
            : assignments.filter(a => !a.account_id || a.account_id === selectedAccountId),
        [assignments, selectedAccountId, isAllAccounts]
    );

    const actualByCategory = useMemo(() => {
        const map = {};
        for (const t of distMonthTx) {
            if (t.type !== 'expense' || !t.category_id) continue;
            if (selectedAccountId) {
                const txAccId = t.account_id ?? t.category?.account_id;
                if (txAccId !== selectedAccountId) continue;
            }
            map[t.category_id] = (map[t.category_id] || 0) + Number(t.amount);
        }
        return map;
    }, [distMonthTx, selectedAccountId]);

    const assignedTotal = useMemo(() => getAssignedTotal(visibleAssignments), [visibleAssignments]);
    const totalActual = useMemo(
        () => visibleAssignments.reduce((sum, a) => sum + (actualByCategory[a.categoryId] || 0), 0),
        [visibleAssignments, actualByCategory]
    );

    // Sort categories by urgency: highest percentage first
    const sortedAssignments = useMemo(() => {
        return [...visibleAssignments]
            .filter(a => a.amount > 0)
            .map(a => {
                const actual = actualByCategory[a.categoryId] || 0;
                const pct = a.amount > 0 ? (actual / a.amount) * 100 : 0;
                return { ...a, actual, pct };
            })
            .sort((a, b) => b.pct - a.pct);
    }, [visibleAssignments, actualByCategory]);

    const activeCategories = sortedAssignments;

    const assignedCategoryIds = useMemo(() => new Set(visibleAssignments.map(a => a.categoryId)), [visibleAssignments]);
    const availableCategories = useMemo(
        () => expenseCategories.filter(c => !assignedCategoryIds.has(c.id)),
        [expenseCategories, assignedCategoryIds]
    );

    const updateAmount = useCallback((visibleIdx, value) => {
        const target = visibleAssignments[visibleIdx];
        const clean = value.replace(/[^0-9]/g, '');
        setIsDirty(true);
        setAssignments(prev => prev.map(a => a === target ? { ...a, amount: Number(clean) || 0 } : a));
    }, [visibleAssignments]);

    const removeAssignment = useCallback((visibleIdx) => {
        const target = visibleAssignments[visibleIdx];
        setIsDirty(true);
        if (target.budgetItemId && !target.isLocal) {
            setRemovedIds(r => [...r, target.budgetItemId]);
        }
        setAssignments(prev => prev.filter(a => a !== target));
    }, [visibleAssignments]);

    const addCategory = useCallback((category) => {
        setIsDirty(true);
        setAssignments(prev => [...prev, {
            budgetItemId: null,
            categoryId: category.id,
            category,
            amount: 0,
            account_id: selectedAccountId,
            isLocal: true,
        }]);
        setPickerVisible(false);
    }, [selectedAccountId]);

    const handleSave = useCallback(async () => {
        setSaving(true);
        try {
            for (const id of removedIds) {
                await budgetSvc.deleteBudgetItem(id);
            }
            for (let i = 0; i < visibleAssignments.length; i++) {
                const a = visibleAssignments[i];
                const payload = {
                    category_id: a.categoryId,
                    account_id: a.account_id ?? selectedAccountId ?? null,
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
            showToast({ type: 'success', message: 'Planificacion guardada' });
        } catch (e) {
            showError(e);
        } finally {
            setSaving(false);
        }
    }, [visibleAssignments, removedIds, distMonth, selectedAccountId, showToast]);

    const distLoading = distTxLoading || distBudgetLoading;
    const budgetPct = assignedTotal > 0 ? (totalActual / assignedTotal) * 100 : 0;
    const budgetRemaining = assignedTotal - totalActual;
    const daysLeft = getDaysRemaining();

    return (
        <FrostBackground edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
                <Text className="text-xl font-bold text-slate-900 dark:text-white">Presupuesto</Text>
                <View className="flex-row items-center gap-2">
                    <AccountSwitcher />
                    <TouchableOpacity
                        onPress={() => setEditVisible(true)}
                        className="h-9 w-9 items-center justify-center rounded-full bg-primary-faint dark:bg-primary/10"
                    >
                        <MaterialIcons name="edit" size={16} color="#6366F1" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
                {/* Month navigator */}
                <View className="flex-row items-center justify-center gap-4 px-5 pb-4">
                    <TouchableOpacity onPress={() => setDistMonth(m => shiftMonth(m, -1))} className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                        <MaterialIcons name="chevron-left" size={20} color="#64748b" />
                    </TouchableOpacity>
                    <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 min-w-[140px] text-center">
                        {monthLabel(distMonth)}
                    </Text>
                    <TouchableOpacity onPress={() => setDistMonth(m => shiftMonth(m, 1))} className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                        <MaterialIcons name="chevron-right" size={20} color="#64748b" />
                    </TouchableOpacity>
                </View>

                <View className="px-5">
                    {distLoading ? (
                        <View className="gap-3">
                            <SkeletonLoader.Metric />
                            <SkeletonLoader.Card lines={4} />
                        </View>
                    ) : visibleAssignments.length === 0 ? (
                        <FadeIn delay={100}>
                            <ScalePress onPress={() => setEditVisible(true)}>
                                <EmptyState
                                    icon="pie-chart-outline"
                                    title="Sin presupuesto"
                                    subtitle="Define cuanto queres gastar en cada categoria este mes"
                                    actionLabel="Configurar presupuesto"
                                    onAction={() => setEditVisible(true)}
                                />
                            </ScalePress>
                        </FadeIn>
                    ) : (
                        <>
                            {/* Summary Card */}
                            <FadeIn delay={100}>
                                <View className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-slate-200 dark:border-slate-700 mb-4 shadow-sm">
                                    <View className="flex-row items-center justify-between mb-4">
                                        <View>
                                            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Asignado</Text>
                                            <Text className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                                                {formatCurrency(assignedTotal, selectedAccount?.currency)}
                                            </Text>
                                        </View>
                                        <View className="items-center">
                                            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gastado</Text>
                                            <Text className="text-lg font-extrabold mt-0.5 text-red-500">
                                                {formatCurrency(totalActual, selectedAccount?.currency)}
                                            </Text>
                                        </View>
                                        <View className="items-end">
                                            <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Disponible</Text>
                                            <Text className={`text-lg font-extrabold mt-0.5 ${budgetRemaining >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                {budgetRemaining >= 0 ? '' : '-'}{formatCurrency(Math.abs(budgetRemaining), selectedAccount?.currency)}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Segmented progress bar */}
                                    <View className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden flex-row">
                                        {sortedAssignments.map((a, idx) => {
                                            const segPct = assignedTotal > 0 ? (a.actual / assignedTotal) * 100 : 0;
                                            if (segPct <= 0) return null;
                                            return (
                                                <View
                                                    key={a.budgetItemId || `bar-${idx}`}
                                                    style={{ width: `${Math.min(segPct, 100)}%`, backgroundColor: budgetBarColor(a.pct) }}
                                                    className="h-full"
                                                />
                                            );
                                        })}
                                    </View>

                                    <View className="flex-row items-center justify-between mt-3">
                                        <StatusBadge status={StatusBadge.getStatus(budgetPct)} size="sm" />
                                        <Text className="text-xs text-slate-400 font-medium">
                                            {daysLeft} dia{daysLeft !== 1 ? 's' : ''} restante{daysLeft !== 1 ? 's' : ''}
                                        </Text>
                                    </View>
                                </View>
                            </FadeIn>

                            {/* Active Category cards (sorted by urgency) */}
                            {activeCategories.length > 0 && (
                                <FadeIn delay={200}>
                                    <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                                        Categorias ({activeCategories.length})
                                    </Text>
                                </FadeIn>
                            )}

                            {activeCategories.map((a, idx) => {
                                const style = getCategoryStyle(a.category?.color);
                                const remaining = a.amount - a.actual;
                                const color = budgetBarColor(a.pct);

                                return (
                                    <FadeIn key={a.budgetItemId || `cat-${idx}`} delay={250 + idx * 60}>
                                        <View
                                            className={`bg-white dark:bg-card-dark rounded-2xl p-4 border mb-3 shadow-sm ${a.pct >= 100 ? 'border-red-200 dark:border-red-900/30' : a.pct >= 85 ? 'border-amber-200 dark:border-amber-900/30' : 'border-slate-200 dark:border-slate-700'}`}
                                        >
                                            <View className="flex-row items-center gap-3 mb-3">
                                                <View className={`h-9 w-9 rounded-xl items-center justify-center ${style.bg}`}>
                                                    <MaterialIcons name={a.category?.icon || 'category'} size={18} color={style.hex} />
                                                </View>
                                                <Text className="flex-1 text-sm font-bold text-slate-800 dark:text-white" numberOfLines={1}>
                                                    {a.category?.name || 'Sin categoria'}
                                                </Text>
                                                <View className="h-7 min-w-[36px] items-center justify-center rounded-full" style={{ backgroundColor: color + '18' }}>
                                                    <Text className="text-xs font-extrabold px-2" style={{ color }}>
                                                        {Math.round(a.pct)}%
                                                    </Text>
                                                </View>
                                            </View>

                                            <AnimatedProgressBar
                                                percentage={a.pct}
                                                color={color}
                                                height={8}
                                                delay={400 + idx * 80}
                                            />

                                            <View className="flex-row items-center justify-between mt-2.5">
                                                <Text className="text-xs text-slate-400 font-medium">
                                                    {formatCurrency(a.actual, selectedAccount?.currency)} / {formatCurrency(a.amount, selectedAccount?.currency)}
                                                </Text>
                                                <Text className={`text-xs font-semibold ${remaining >= 0 ? 'text-slate-500 dark:text-slate-400' : 'text-red-500'}`}>
                                                    {remaining >= 0
                                                        ? `Quedan ${formatCurrency(remaining, selectedAccount?.currency)}`
                                                        : `Excedido ${formatCurrency(Math.abs(remaining), selectedAccount?.currency)}`
                                                    }
                                                </Text>
                                            </View>
                                        </View>
                                    </FadeIn>
                                );
                            })}


                            {/* Unassigned spending */}
                            {(() => {
                                const unassignedSpending = Object.entries(actualByCategory)
                                    .filter(([catId]) => !assignedCategoryIds.has(catId))
                                    .reduce((s, [, v]) => s + v, 0);
                                if (unassignedSpending <= 0) return null;
                                return (
                                    <View className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-3 border border-dashed border-slate-200 dark:border-slate-700">
                                        <View className="flex-row items-center gap-3">
                                            <View className="h-9 w-9 rounded-xl items-center justify-center bg-slate-200 dark:bg-slate-700">
                                                <MaterialIcons name="help-outline" size={18} color="#94A3B8" />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-sm font-semibold text-slate-600 dark:text-slate-400">Sin presupuesto asignado</Text>
                                                <Text className="text-xs text-slate-400 mt-0.5">Gastos fuera del plan</Text>
                                            </View>
                                            <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                {formatCurrency(unassignedSpending, selectedAccount?.currency)}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })()}
                        </>
                    )}
                </View>
            </ScrollView>

            {/* Edit Budget Bottom Sheet */}
            <BottomSheet
                visible={editVisible}
                onClose={() => setEditVisible(false)}
                title="Editar Presupuesto"
                subtitle={selectedAccount ? `${selectedAccount.name} · ${monthLabel(distMonth)}` : `Todas las cuentas · ${monthLabel(distMonth)}`}
            >
                <ScrollView className="px-5" contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
                    <View className="gap-3">
                        {visibleAssignments.map((a, idx) => {
                            const style = getCategoryStyle(a.category?.color);
                            return (
                                <View key={a.budgetItemId || `local-${idx}`} className="flex-row items-center gap-3 bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm px-4 py-3">
                                    <View className={`h-9 w-9 rounded-xl items-center justify-center ${style.bg}`}>
                                        <MaterialIcons name={a.category?.icon || 'category'} size={20} color={style.hex} />
                                    </View>
                                    <Text className="flex-1 text-sm font-semibold text-slate-900 dark:text-white" numberOfLines={1}>
                                        {a.category?.name || 'Sin categoria'}
                                    </Text>
                                    <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-lg px-2">
                                        <Text className="text-slate-400 font-bold text-sm">{getCurrencySymbol(selectedAccount?.currency)}</Text>
                                        <TextInput
                                            value={a.amount > 0 ? String(a.amount) : ''}
                                            onChangeText={(v) => updateAmount(idx, v)}
                                            keyboardType="numeric"
                                            placeholder="0"
                                            placeholderTextColor="#94A3B8"
                                            maxLength={15}
                                            className="w-20 h-9 text-center text-sm font-bold text-slate-900 dark:text-white"
                                        />
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => removeAssignment(idx)}
                                        className="h-7 w-7 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10"
                                    >
                                        <MaterialIcons name="close" size={16} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>

                    <TouchableOpacity
                        onPress={() => setPickerVisible(true)}
                        disabled={availableCategories.length === 0}
                        className={`flex-row items-center justify-center gap-2 mt-4 py-3 rounded-xl border border-dashed ${availableCategories.length > 0 ? 'border-primary/40 bg-primary-faint dark:bg-primary/10' : 'border-slate-200 dark:border-slate-700'}`}
                    >
                        <MaterialIcons name="add" size={18} color={availableCategories.length > 0 ? '#6366F1' : '#94A3B8'} />
                        <Text className={`text-sm font-bold ${availableCategories.length > 0 ? 'text-primary' : 'text-slate-400'}`}>
                            Agregar categoria
                        </Text>
                    </TouchableOpacity>
                </ScrollView>

                {isDirty && (
                    <View className="px-5 pt-3 pb-2 border-t border-slate-100 dark:border-slate-800">
                        <Button
                            variant="primary"
                            size="lg"
                            fullWidth
                            loading={saving}
                            onPress={handleSave}
                        >
                            Guardar
                        </Button>
                    </View>
                )}
            </BottomSheet>

            {/* Category Picker */}
            <BottomSheet
                visible={pickerVisible}
                onClose={() => setPickerVisible(false)}
                title="Seleccionar categoria"
                maxHeight="70%"
            >
                <ScrollView className="px-5 pb-8">
                    {availableCategories.length === 0 ? (
                        <View className="items-center py-8">
                            <MaterialIcons name="check-circle" size={40} color="#10b981" />
                            <Text className="text-slate-400 text-sm font-medium mt-3">Todas las categorias asignadas</Text>
                        </View>
                    ) : (
                        <View className="gap-2 pb-8 pt-4">
                            {availableCategories.map(cat => {
                                const style = getCategoryStyle(cat.color);
                                return (
                                    <TouchableOpacity
                                        key={cat.id}
                                        onPress={() => addCategory(cat)}
                                        className="flex-row items-center gap-3 p-4 bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
                                    >
                                        <View className={`h-10 w-10 rounded-xl items-center justify-center ${style.bg}`}>
                                            <MaterialIcons name={cat.icon} size={22} color={style.hex} />
                                        </View>
                                        <Text className="flex-1 text-sm font-bold text-slate-900 dark:text-white">{cat.name}</Text>
                                        <MaterialIcons name="add-circle-outline" size={22} color="#94A3B8" />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            </BottomSheet>

            {ToastComponent}
        </FrostBackground>
    );
}
