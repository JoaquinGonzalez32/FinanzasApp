import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, useColorScheme, Platform } from 'react-native';
import { showError } from '../../src/lib/friendlyError';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { ProgressBar, StatusBadge, SkeletonLoader, Button, useToast, FadeIn, ScalePress, AnimatedProgressBar, FrostBackground } from '../../components/ui';
import { useTransactions } from '../../src/hooks/useTransactions';
import { useAccounts } from '../../src/hooks/useAccounts';
import { useBudget } from '../../src/hooks/useBudget';
import { useCategories } from '../../src/hooks/useCategories';
import { emitBudgetChange } from '../../src/lib/events';
import * as budgetSvc from '../../src/services/budgetService';
import {
    formatCurrency, getCategoryStyle, getCurrencySymbol, sumByType, MONTHS_ES,
    getCurrentMonth, parseMonth, shiftMonth, monthLabel,
    getCategoryAssignments, getAssignedTotal,
} from '../../src/lib/helpers';

function barColor(pct) {
    if (pct >= 100) return '#ef4444';
    if (pct >= 85) return '#f59e0b';
    if (pct >= 65) return '#137fec';
    return '#10b981';
}

function getDaysRemaining() {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return lastDay - now.getDate();
}

export default function DashboardScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const { transactions: monthTx } = useTransactions({ mode: 'month' });
    const { accounts } = useAccounts();
    const { show: showToast, ToastComponent } = useToast();

    const [selectedAccountId, setSelectedAccountId] = useState(null);

    useEffect(() => {
        if (accounts.length > 0 && !selectedAccountId) {
            setSelectedAccountId(accounts[0].id);
        }
    }, [accounts]);

    const selectedAccount = useMemo(
        () => accounts.find(a => a.id === selectedAccountId) ?? accounts[0] ?? null,
        [accounts, selectedAccountId]
    );

    // Planning state
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
        () => assignments.filter(a => !a.account_id || a.account_id === selectedAccountId),
        [assignments, selectedAccountId]
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
                <Text className="text-xl font-bold text-stone-900 dark:text-white">Presupuesto</Text>
                <TouchableOpacity
                    onPress={() => setEditVisible(true)}
                    className="h-9 w-9 items-center justify-center rounded-full bg-primary/10"
                >
                    <MaterialIcons name="edit" size={16} color="#137fec" />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
                {/* Month navigator */}
                <View className="flex-row items-center justify-center gap-4 px-5 pb-4">
                    <TouchableOpacity onPress={() => setDistMonth(m => shiftMonth(m, -1))} className="h-8 w-8 items-center justify-center rounded-full bg-frost dark:bg-slate-800">
                        <MaterialIcons name="chevron-left" size={20} color="#64748b" />
                    </TouchableOpacity>
                    <Text className="text-sm font-semibold text-stone-700 dark:text-slate-300 min-w-[140px] text-center">
                        {monthLabel(distMonth)}
                    </Text>
                    <TouchableOpacity onPress={() => setDistMonth(m => shiftMonth(m, 1))} className="h-8 w-8 items-center justify-center rounded-full bg-frost dark:bg-slate-800">
                        <MaterialIcons name="chevron-right" size={20} color="#64748b" />
                    </TouchableOpacity>
                </View>

                {/* Account chips */}
                {accounts.length > 1 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 16 }}>
                        {accounts.map(acc => {
                            const isActive = acc.id === selectedAccountId;
                            const style = getCategoryStyle(acc.color);
                            return (
                                <TouchableOpacity
                                    key={acc.id}
                                    onPress={() => setSelectedAccountId(acc.id)}
                                    className={`flex-row items-center gap-2 px-3 py-2 rounded-xl border ${isActive ? 'bg-primary/5 dark:bg-primary/10 border-primary/30' : 'bg-white/75 dark:bg-surface-dark border-white/40 dark:border-slate-800'}`}
                                >
                                    <View className={`h-6 w-6 rounded-md items-center justify-center ${isActive ? 'bg-primary/20' : style.bg}`}>
                                        <MaterialIcons name={acc.icon || 'account-balance-wallet'} size={12} color={isActive ? '#137fec' : style.hex} />
                                    </View>
                                    <Text className={`text-xs font-bold ${isActive ? 'text-primary' : 'text-stone-600 dark:text-slate-400'}`}>
                                        {acc.name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                )}

                <View className="px-5">
                    {distLoading ? (
                        <View className="gap-3">
                            <SkeletonLoader.Metric />
                            <SkeletonLoader.Card lines={4} />
                        </View>
                    ) : visibleAssignments.length === 0 ? (
                        /* Empty state */
                        <FadeIn delay={100}>
                            <ScalePress onPress={() => setEditVisible(true)}>
                                <View className="bg-white/75 dark:bg-card-dark p-8 rounded-2xl shadow-sm border border-dashed border-white/40 dark:border-slate-700 items-center">
                                    <View className="h-16 w-16 rounded-2xl bg-primary/10 items-center justify-center mb-4">
                                        <MaterialIcons name="pie-chart-outline" size={32} color="#137fec" />
                                    </View>
                                    <Text className="text-base font-bold text-stone-700 dark:text-slate-300 mb-1">Sin presupuesto</Text>
                                    <Text className="text-sm text-stone-400 text-center mb-4">Define cuanto queres gastar en cada categoria este mes</Text>
                                    <View className="bg-primary/10 px-4 py-2 rounded-xl">
                                        <Text className="text-sm font-bold text-primary">Configurar presupuesto</Text>
                                    </View>
                                </View>
                            </ScalePress>
                        </FadeIn>
                    ) : (
                        <>
                            {/* Summary header */}
                            <FadeIn delay={100}>
                            <View className="bg-white/75 dark:bg-surface-dark rounded-2xl p-4 border border-white/60 dark:border-slate-800 mb-4 shadow-sm"
                            >
                                {/* Three metrics */}
                                <View className="flex-row items-center justify-between mb-4">
                                    <View>
                                        <Text className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Asignado</Text>
                                        <Text className="text-lg font-extrabold text-stone-900 dark:text-white mt-0.5">
                                            {formatCurrency(assignedTotal, selectedAccount?.currency)}
                                        </Text>
                                    </View>
                                    <View className="items-center">
                                        <Text className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Gastado</Text>
                                        <Text className={`text-lg font-extrabold mt-0.5 ${totalActual > assignedTotal ? 'text-red-500' : 'text-stone-900 dark:text-white'}`}>
                                            {formatCurrency(totalActual, selectedAccount?.currency)}
                                        </Text>
                                    </View>
                                    <View className="items-end">
                                        <Text className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Disponible</Text>
                                        <Text className={`text-lg font-extrabold mt-0.5 ${budgetRemaining >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {budgetRemaining >= 0 ? '' : '-'}{formatCurrency(Math.abs(budgetRemaining), selectedAccount?.currency)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Segmented progress bar */}
                                <View className="h-3 w-full bg-frost dark:bg-slate-700 rounded-full overflow-hidden flex-row">
                                    {visibleAssignments.map((a, idx) => {
                                        const style = getCategoryStyle(a.category?.color);
                                        const actual = actualByCategory[a.categoryId] || 0;
                                        const segPct = assignedTotal > 0 ? (actual / assignedTotal) * 100 : 0;
                                        if (segPct <= 0) return null;
                                        const catPct = a.amount > 0 ? (actual / a.amount) * 100 : 0;
                                        return (
                                            <View
                                                key={a.budgetItemId || `bar-${idx}`}
                                                style={{ width: `${Math.min(segPct, 100)}%`, backgroundColor: barColor(catPct) }}
                                                className="h-full"
                                            />
                                        );
                                    })}
                                </View>

                                <View className="flex-row items-center justify-between mt-3">
                                    <StatusBadge status={StatusBadge.getStatus(budgetPct)} size="sm" />
                                    <Text className="text-xs text-stone-400 font-medium">
                                        {daysLeft} dia{daysLeft !== 1 ? 's' : ''} restante{daysLeft !== 1 ? 's' : ''}
                                    </Text>
                                </View>
                            </View>
                            </FadeIn>

                            {/* Category cards */}
                            <FadeIn delay={200}>
                                <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500 mb-3">Categorias</Text>
                            </FadeIn>

                            {visibleAssignments.filter(a => a.amount > 0).map((a, idx) => {
                                const style = getCategoryStyle(a.category?.color);
                                const actual = actualByCategory[a.categoryId] || 0;
                                const catPct = a.amount > 0 ? (actual / a.amount) * 100 : 0;
                                const remaining = a.amount - actual;
                                const color = barColor(catPct);

                                return (
                                    <FadeIn key={a.budgetItemId || `cat-${idx}`} delay={250 + idx * 60}>
                                        <View
                                            className={`bg-white/75 dark:bg-surface-dark rounded-2xl p-4 border mb-3 shadow-md ${catPct >= 100 ? 'border-red-200 dark:border-red-900/30' : 'border-white/40 dark:border-slate-800'}`}
                                        >
                                            <View className="flex-row items-center gap-3 mb-3">
                                                <View className={`h-9 w-9 rounded-xl items-center justify-center ${style.bg}`}>
                                                    <MaterialIcons name={a.category?.icon || 'category'} size={18} color={style.hex} />
                                                </View>
                                                <Text className="flex-1 text-sm font-bold text-stone-800 dark:text-white" numberOfLines={1}>
                                                    {a.category?.name || 'Sin categoria'}
                                                </Text>
                                                <View className="h-7 min-w-[36px] items-center justify-center rounded-full" style={{ backgroundColor: color + '18' }}>
                                                    <Text className="text-xs font-extrabold px-2" style={{ color }}>
                                                        {Math.round(catPct)}%
                                                    </Text>
                                                </View>
                                            </View>

                                            <AnimatedProgressBar
                                                percentage={catPct}
                                                color={color}
                                                height={8}
                                                delay={400 + idx * 80}
                                            />

                                            <View className="flex-row items-center justify-between mt-2.5">
                                                <Text className="text-xs text-stone-400 font-medium">
                                                    {formatCurrency(actual, selectedAccount?.currency)} / {formatCurrency(a.amount, selectedAccount?.currency)}
                                                </Text>
                                                <Text className={`text-xs font-semibold ${remaining >= 0 ? 'text-stone-500 dark:text-slate-400' : 'text-red-500'}`}>
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
                                    <View className="bg-stone-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-3 border border-dashed border-white/40 dark:border-slate-700">
                                        <View className="flex-row items-center gap-3">
                                            <View className="h-9 w-9 rounded-xl items-center justify-center bg-stone-200 dark:bg-slate-700">
                                                <MaterialIcons name="help-outline" size={18} color="#a8a29e" />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-sm font-semibold text-stone-600 dark:text-slate-400">Gastos sin categoria asignada</Text>
                                                <Text className="text-xs text-stone-400 mt-0.5">No incluidos en el presupuesto</Text>
                                            </View>
                                            <Text className="text-sm font-bold text-stone-700 dark:text-slate-300">
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

            {/* Edit Planning Bottom Sheet */}
            <Modal visible={editVisible} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-background-light dark:bg-modal-dark rounded-t-3xl" style={{ maxHeight: '82%' }}>
                        <View className="items-center pt-3 pb-1">
                            <View className="h-1 w-10 rounded-full bg-stone-300 dark:bg-slate-600" />
                        </View>
                        <View className="flex-row items-center justify-between px-5 pt-3 pb-4 border-b border-stone-100 dark:border-slate-800">
                            <View>
                                <Text className="text-lg font-bold text-stone-900 dark:text-white">Editar Presupuesto</Text>
                                {selectedAccount && (
                                    <Text className="text-xs text-stone-400 font-medium mt-0.5">{selectedAccount.name} · {monthLabel(distMonth)}</Text>
                                )}
                            </View>
                            <TouchableOpacity
                                onPress={() => setEditVisible(false)}
                                className="h-8 w-8 items-center justify-center rounded-full bg-frost dark:bg-slate-800"
                            >
                                <MaterialIcons name="close" size={20} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="px-5" contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
                            <View className="gap-3">
                                {visibleAssignments.map((a, idx) => {
                                    const style = getCategoryStyle(a.category?.color);
                                    return (
                                        <View key={a.budgetItemId || `local-${idx}`} className="flex-row items-center gap-3 bg-white/75 dark:bg-card-dark rounded-2xl border border-white/60 dark:border-slate-800 shadow-md px-4 py-3">
                                            <View className={`h-9 w-9 rounded-xl items-center justify-center ${style.bg}`}>
                                                <MaterialIcons name={a.category?.icon || 'category'} size={20} color={style.hex} />
                                            </View>
                                            <Text className="flex-1 text-sm font-semibold text-stone-900 dark:text-white" numberOfLines={1}>
                                                {a.category?.name || 'Sin categoria'}
                                            </Text>
                                            <View className="flex-row items-center bg-frost dark:bg-slate-800 rounded-lg px-2">
                                                <Text className="text-stone-400 font-bold text-sm">{getCurrencySymbol(selectedAccount?.currency)}</Text>
                                                <TextInput
                                                    value={a.amount > 0 ? String(a.amount) : ''}
                                                    onChangeText={(v) => updateAmount(idx, v)}
                                                    keyboardType="numeric"
                                                    placeholder="0"
                                                    placeholderTextColor="#a8a29e"
                                                    maxLength={15}
                                                    className="w-20 h-9 text-center text-sm font-bold text-stone-900 dark:text-white"
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
                                className={`flex-row items-center justify-center gap-2 mt-4 py-3 rounded-xl border border-dashed ${availableCategories.length > 0 ? 'border-primary/40 bg-primary/5 dark:bg-primary/10' : 'border-white/40 dark:border-slate-700'}`}
                            >
                                <MaterialIcons name="add" size={18} color={availableCategories.length > 0 ? '#137fec' : '#a8a29e'} />
                                <Text className={`text-sm font-bold ${availableCategories.length > 0 ? 'text-primary' : 'text-stone-400'}`}>
                                    Agregar categoria
                                </Text>
                            </TouchableOpacity>
                        </ScrollView>

                        {isDirty && (
                            <View className="px-5 pt-3 pb-2 border-t border-stone-100 dark:border-slate-800">
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
                        <SafeAreaView edges={['bottom']} />
                    </View>
                </View>
            </Modal>

            {/* Category Picker Modal */}
            <Modal visible={pickerVisible} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-background-light dark:bg-background-dark rounded-t-3xl max-h-[70%]">
                        <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
                            <Text className="text-lg font-bold text-stone-900 dark:text-white">Seleccionar categoria</Text>
                            <TouchableOpacity onPress={() => setPickerVisible(false)} className="h-8 w-8 items-center justify-center rounded-full bg-frost dark:bg-slate-800">
                                <MaterialIcons name="close" size={20} color="#64748b" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView className="px-5 pb-8">
                            {availableCategories.length === 0 ? (
                                <View className="items-center py-8">
                                    <MaterialIcons name="check-circle" size={40} color="#10b981" />
                                    <Text className="text-stone-400 text-sm font-medium mt-3">Todas las categorias ya estan asignadas</Text>
                                </View>
                            ) : (
                                <View className="gap-2 pb-8">
                                    {availableCategories.map(cat => {
                                        const style = getCategoryStyle(cat.color);
                                        return (
                                            <TouchableOpacity
                                                key={cat.id}
                                                onPress={() => addCategory(cat)}
                                                className="flex-row items-center gap-3 p-4 bg-white/75 dark:bg-card-dark rounded-2xl border border-white/60 dark:border-slate-800 shadow-md"
                                            >
                                                <View className={`h-10 w-10 rounded-xl items-center justify-center ${style.bg}`}>
                                                    <MaterialIcons name={cat.icon} size={22} color={style.hex} />
                                                </View>
                                                <Text className="flex-1 text-sm font-bold text-stone-900 dark:text-white">{cat.name}</Text>
                                                <MaterialIcons name="add-circle-outline" size={22} color="#a8a29e" />
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

            {ToastComponent}
        </FrostBackground>
    );
}
