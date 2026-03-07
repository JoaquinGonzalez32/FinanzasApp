import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { showError } from '../src/lib/friendlyError';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button, Card, ProgressBar, StatusBadge, SkeletonLoader, useToast } from '../components/ui';
import { useBudget } from '../src/hooks/useBudget';
import { useCategories } from '../src/hooks/useCategories';
import { useTransactions } from '../src/hooks/useTransactions';
import { useAccounts } from '../src/hooks/useAccounts';
import { formatCurrency, getCategoryStyle, getCurrencySymbol, getCurrentMonth, parseMonth, shiftMonth, monthLabel } from '../src/lib/helpers';
import { emitBudgetChange } from '../src/lib/events';
import * as svc from '../src/services/budgetService';
import { computeWeeklyReview } from '../src/lib/weeklyReview';

const REVIEW_STATUS_CFG = {
    en_ritmo:    { label: 'En ritmo',   pillBg: 'bg-emerald-50 dark:bg-emerald-500/10', pillText: 'text-emerald-600', barColor: '#10b981' },
    en_riesgo:   { label: 'En riesgo',  pillBg: 'bg-amber-50 dark:bg-amber-500/10',     pillText: 'text-amber-600',   barColor: '#f59e0b' },
    critica:     { label: 'Critica',    pillBg: 'bg-red-50 dark:bg-red-500/10',         pillText: 'text-red-500',     barColor: '#ef4444' },
    no_evaluable:{ label: 'Dato unico', pillBg: 'bg-frost dark:bg-slate-800',       pillText: 'text-stone-500',   barColor: '#a8a29e' },
    sin_datos:   { label: 'Sin datos',  pillBg: 'bg-frost dark:bg-slate-800',       pillText: 'text-stone-400',   barColor: '#a8a29e' },
};

export default function PlanningScreen() {
    const router = useRouter();
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
    const { budgetItems, loading } = useBudget(selectedMonth);
    const { categories: expenseCategories } = useCategories('expense');
    const { show: showToast, ToastComponent } = useToast();

    const { year: txYear, month: txMonth } = parseMonth(selectedMonth);
    const { transactions } = useTransactions({ mode: 'month', year: txYear, month: txMonth });
    const { accounts } = useAccounts();

    const [selectedAccountId, setSelectedAccountId] = useState(null);

    useEffect(() => {
        if (accounts.length > 0 && selectedAccountId === null) {
            setSelectedAccountId(accounts[0].id);
        }
    }, [accounts]);

    const monthIncome = useMemo(
        () => transactions
            .filter(t => {
                if (t.type !== 'income') return false;
                if (!selectedAccountId) return true;
                const txAccId = t.account_id ?? t.category?.account_id;
                return txAccId === selectedAccountId;
            })
            .reduce((s, t) => s + Number(t.amount), 0),
        [transactions, selectedAccountId]
    );

    const [items, setItems] = useState([]);
    const [removedIds, setRemovedIds] = useState([]);
    const [saving, setSaving] = useState(false);
    const [pickerVisible, setPickerVisible] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (!loading && !isDirty) {
            setItems(budgetItems.map(b => ({
                ...b,
                _local: false,
                _fixedAmount: b.percentage > 0 ? String(b.percentage) : '',
            })));
            setRemovedIds([]);
        }
    }, [loading, budgetItems, isDirty]);

    useEffect(() => {
        setIsDirty(false);
        setItems([]);
        setRemovedIds([]);
    }, [selectedMonth]);

    const visibleItems = useMemo(
        () => items.filter(item => !item.account_id || item.account_id === selectedAccountId),
        [items, selectedAccountId]
    );

    const assignedCategoryIds = useMemo(
        () => new Set(visibleItems.map(i => i.category_id)),
        [visibleItems]
    );

    const availableCategories = useMemo(
        () => expenseCategories.filter(c =>
            !assignedCategoryIds.has(c.id) &&
            (!c.account_id || c.account_id === selectedAccountId)
        ),
        [expenseCategories, assignedCategoryIds, selectedAccountId]
    );

    const selectedCurrency = accounts.find(a => a.id === selectedAccountId)?.currency;

    const totalAmount = useMemo(
        () => visibleItems.reduce((s, i) => s + (Number(i._fixedAmount) || 0), 0),
        [visibleItems]
    );

    const weeklyReview = useMemo(() => {
        if (selectedMonth !== getCurrentMonth()) return null;
        const inputs = visibleItems.map(item => ({
            categoryId: item.category_id,
            category: item.category,
            plannedAmount: Number(item._fixedAmount) || 0,
        }));
        return computeWeeklyReview(inputs, transactions, selectedMonth, selectedAccountId);
    }, [visibleItems, transactions, selectedMonth, selectedAccountId]);

    const updateItem = useCallback((visibleIdx, field, value) => {
        setIsDirty(true);
        const target = visibleItems[visibleIdx];
        setItems(prev => prev.map(it => it === target ? { ...it, [field]: value } : it));
    }, [visibleItems]);

    const removeItem = useCallback((visibleIdx) => {
        const target = visibleItems[visibleIdx];
        if (target.id && !target._local) {
            setRemovedIds(r => [...r, target.id]);
        }
        setItems(prev => prev.filter(it => it !== target));
        setIsDirty(true);
    }, [visibleItems]);

    const addCategory = useCallback((category) => {
        setIsDirty(true);
        setItems(prev => [
            ...prev,
            {
                category_id: category.id,
                category: category,
                account_id: selectedAccountId || null,
                percentage: 0,
                _fixedAmount: '',
                sort_order: prev.length,
                _local: true,
            },
        ]);
        setPickerVisible(false);
    }, [selectedAccountId]);

    const handleSave = useCallback(async () => {
        setSaving(true);
        try {
            for (const id of removedIds) {
                await svc.deleteBudgetItem(id);
            }
            for (let i = 0; i < visibleItems.length; i++) {
                const item = visibleItems[i];
                const amount = Number(item._fixedAmount) || 0;
                const payload = {
                    category_id: item.category_id,
                    account_id: item.account_id || null,
                    percentage: amount,
                    month: selectedMonth,
                    sort_order: i,
                };
                if (item._local || !item.id) {
                    await svc.createBudgetItem(payload);
                } else {
                    await svc.updateBudgetItem(item.id, payload);
                }
            }
            emitBudgetChange();
            router.back();
        } catch (e) {
            showError(e);
        } finally {
            setSaving(false);
        }
    }, [visibleItems, removedIds, router, selectedMonth]);

    if (loading) {
        return (
            <View className="flex-1 bg-background-light dark:bg-background-dark px-5 pt-20">
                <SkeletonLoader.Card lines={2} />
                <View className="mt-4" />
                <SkeletonLoader.Card lines={4} />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="px-4 pt-4 pb-4 bg-background-light/80 dark:bg-background-dark/80 border-b border-white/40 dark:border-slate-800 z-10">
                <SafeAreaView edges={['top']} className="flex-row items-center justify-between h-12">
                    <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-frost dark:bg-slate-800">
                        <MaterialIcons name="arrow-back-ios-new" size={18} color="#475569" />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-stone-900 dark:text-white">Planificacion</Text>
                    <TouchableOpacity
                        onPress={() => setPickerVisible(true)}
                        disabled={availableCategories.length === 0}
                        className={`h-10 w-10 items-center justify-center rounded-full ${availableCategories.length > 0 ? 'bg-primary/10' : 'bg-frost dark:bg-slate-800'}`}
                    >
                        <MaterialIcons name="add" size={24} color={availableCategories.length > 0 ? '#6366F1' : '#a8a29e'} />
                    </TouchableOpacity>
                </SafeAreaView>
            </View>

            <ScrollView className="flex-1 px-5 py-6" keyboardShouldPersistTaps="handled">
                <View className="gap-6 pb-24">
                    {/* Month selector */}
                    <View className="flex-row items-center justify-center gap-4">
                        <TouchableOpacity onPress={() => setSelectedMonth(m => shiftMonth(m, -1))} className="h-10 w-10 items-center justify-center rounded-full bg-frost dark:bg-slate-800">
                            <MaterialIcons name="chevron-left" size={24} color="#475569" />
                        </TouchableOpacity>
                        <Text className="text-base font-bold text-stone-900 dark:text-white min-w-[160px] text-center">
                            {monthLabel(selectedMonth)}
                        </Text>
                        <TouchableOpacity
                            onPress={() => setSelectedMonth(m => shiftMonth(m, 1))}
                            className="h-10 w-10 items-center justify-center rounded-full bg-frost dark:bg-slate-800"
                        >
                            <MaterialIcons name="chevron-right" size={24} color="#475569" />
                        </TouchableOpacity>
                    </View>

                    {/* Account selector */}
                    {accounts.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                            {accounts.map((acc) => {
                                const isActive = selectedAccountId === acc.id;
                                return (
                                    <TouchableOpacity
                                        key={acc.id}
                                        onPress={() => setSelectedAccountId(acc.id)}
                                        className={`flex-row items-center gap-2 mr-3 px-4 py-2.5 rounded-xl ${isActive ? 'bg-primary/10 border border-primary/20' : 'bg-frost dark:bg-input-dark'}`}
                                    >
                                        <MaterialIcons name={acc.icon || 'account-balance-wallet'} size={18} color={isActive ? '#6366F1' : '#475569'} />
                                        <Text className={`text-sm font-semibold ${isActive ? 'text-primary' : 'text-stone-600 dark:text-slate-400'}`}>{acc.name}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}

                    {/* Empty state */}
                    {visibleItems.length === 0 && (
                        <View className="items-center py-12">
                            <View className="h-16 w-16 rounded-2xl bg-frost dark:bg-input-dark items-center justify-center mb-4">
                                <MaterialIcons name="pie-chart-outline" size={32} color="#a8a29e" />
                            </View>
                            <Text className="text-stone-500 text-base font-medium">Sin distribucion configurada</Text>
                            <TouchableOpacity onPress={() => setPickerVisible(true)} className="mt-4">
                                <Button variant="ghost" icon="add-circle-outline" onPress={() => setPickerVisible(true)}>
                                    Agregar categoria
                                </Button>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Items */}
                    <View className="gap-3">
                        {visibleItems.map((item, idx) => {
                            const cat = item.category;
                            const style = getCategoryStyle(cat?.color);
                            return (
                                <Card key={item.id || `local-${idx}`} variant="outlined">
                                    <View className="flex-row items-center gap-3">
                                        <View className={`h-10 w-10 rounded-xl items-center justify-center ${style.bg}`}>
                                            <MaterialIcons name={cat?.icon || 'category'} size={22} color={style.hex} />
                                        </View>
                                        <Text className="flex-1 text-sm font-bold text-stone-900 dark:text-white" numberOfLines={1}>
                                            {cat?.name || 'Sin categoria'}
                                        </Text>
                                        <View className="flex-row items-center">
                                            <Text className="text-stone-400 font-bold text-base mr-1">{getCurrencySymbol(selectedCurrency)}</Text>
                                            <TextInput
                                                value={item._fixedAmount ?? ''}
                                                onChangeText={(v) => {
                                                    const clean = v.replace(/[^0-9]/g, '');
                                                    updateItem(idx, '_fixedAmount', clean);
                                                }}
                                                keyboardType="numeric"
                                                maxLength={15}
                                                className="w-24 h-10 bg-frost dark:bg-slate-800 rounded-lg text-center text-base font-bold text-stone-900 dark:text-white"
                                            />
                                        </View>
                                        <TouchableOpacity onPress={() => removeItem(idx)} className="h-8 w-8 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10 ml-1">
                                            <MaterialIcons name="close" size={18} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                </Card>
                            );
                        })}
                    </View>

                    {/* Total bar */}
                    {visibleItems.length > 0 && (
                        <Card variant="outlined" className={monthIncome > 0 && totalAmount <= monthIncome ? 'bg-primary/5 dark:bg-primary/10 border-primary/20' : 'bg-amber-50 dark:bg-amber-500/10 border-amber-300/30'}>
                            <View className="flex-row justify-between items-end mb-4">
                                <View>
                                    <Text className={`text-xs font-semibold uppercase ${monthIncome > 0 && totalAmount <= monthIncome ? 'text-primary' : 'text-amber-600'}`}>Total Asignado</Text>
                                    <Text className={`text-3xl font-extrabold ${monthIncome > 0 && totalAmount <= monthIncome ? 'text-primary' : 'text-amber-600'}`}>{formatCurrency(totalAmount, selectedCurrency)}</Text>
                                </View>
                                {monthIncome > 0 && (
                                    <View className="items-end">
                                        <Text className="text-xs font-semibold text-stone-400">
                                            de {formatCurrency(monthIncome, selectedCurrency)}
                                        </Text>
                                        <Text className={`text-xs font-bold ${totalAmount > monthIncome ? 'text-amber-600' : 'text-emerald-500'}`}>
                                            {totalAmount > monthIncome ? `Excede ${formatCurrency(totalAmount - monthIncome, selectedCurrency)}` : `Disponible ${formatCurrency(monthIncome - totalAmount, selectedCurrency)}`}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            {monthIncome > 0 && (
                                <View className="h-3 w-full bg-stone-200 dark:bg-slate-700 rounded-full overflow-hidden flex-row">
                                    {visibleItems.map((item, idx) => {
                                        const style = getCategoryStyle(item.category?.color);
                                        const amt = Number(item._fixedAmount) || 0;
                                        const pct = (amt / monthIncome) * 100;
                                        if (pct <= 0) return null;
                                        return (
                                            <View
                                                key={item.id || `bar-${idx}`}
                                                style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: style.hex }}
                                                className="h-full"
                                            />
                                        );
                                    })}
                                </View>
                            )}
                        </Card>
                    )}

                    {/* Weekly review */}
                    {weeklyReview && weeklyReview.items.some(i => i.status !== 'sin_datos') && (
                        <View className="gap-3">
                            <Text className="text-sm font-bold text-stone-900 dark:text-white">Revision semanal</Text>

                            <View className="flex-row flex-wrap gap-2">
                                {weeklyReview.enRitmoCount > 0 && (
                                    <StatusBadge status="optimal" label={`${weeklyReview.enRitmoCount} en ritmo`} />
                                )}
                                {weeklyReview.enRiesgoCount > 0 && (
                                    <StatusBadge status="warning" label={`${weeklyReview.enRiesgoCount} en riesgo`} />
                                )}
                                {weeklyReview.criticaCount > 0 && (
                                    <StatusBadge status="critical" label={`${weeklyReview.criticaCount} critica${weeklyReview.criticaCount !== 1 ? 's' : ''}`} />
                                )}
                            </View>

                            {weeklyReview.items
                                .filter(item => item.status !== 'sin_datos')
                                .map(item => {
                                    const catStyle = getCategoryStyle(item.category?.color);
                                    const cfg = REVIEW_STATUS_CFG[item.status] ?? REVIEW_STATUS_CFG.en_ritmo;
                                    const spentPct = item.planned > 0 ? Math.min((item.spent / item.planned) * 100, 100) : 0;
                                    return (
                                        <Card key={item.categoryId} variant="outlined">
                                            <View className="flex-row items-center gap-3 mb-3">
                                                <View className={`h-8 w-8 rounded-lg items-center justify-center ${catStyle.bg}`}>
                                                    <MaterialIcons name={item.category.icon || 'category'} size={18} color={catStyle.hex} />
                                                </View>
                                                <Text className="flex-1 text-sm font-bold text-stone-900 dark:text-white" numberOfLines={1}>
                                                    {item.category.name}
                                                </Text>
                                                <View className={`px-2.5 py-1 rounded-full ${cfg.pillBg}`}>
                                                    <Text className={`text-xs font-bold ${cfg.pillText}`}>{cfg.label}</Text>
                                                </View>
                                            </View>

                                            {item.status === 'no_evaluable' ? (
                                                <Text className="text-xs text-stone-400">Solo 1 transaccion - tendencia no evaluable</Text>
                                            ) : (
                                                <View className="gap-1.5">
                                                    <View className="flex-row justify-between">
                                                        <Text className="text-xs text-stone-400">Presupuesto</Text>
                                                        <Text className="text-xs font-bold text-stone-600 dark:text-slate-300">{formatCurrency(item.planned, selectedCurrency)}</Text>
                                                    </View>
                                                    <View className="flex-row justify-between">
                                                        <Text className="text-xs text-stone-400">Proyeccion al cierre</Text>
                                                        <Text className={`text-xs font-bold ${item.difference > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                                            {formatCurrency(item.projection, selectedCurrency)}
                                                        </Text>
                                                    </View>
                                                    <View className="flex-row justify-between">
                                                        <Text className="text-xs text-stone-400">{item.difference > 0 ? 'Excedente est.' : 'Ahorro est.'}</Text>
                                                        <Text className={`text-xs font-bold ${item.difference > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                                            {item.difference > 0 ? '+' : '-'}{formatCurrency(item.difference, selectedCurrency)}
                                                        </Text>
                                                    </View>
                                                    <ProgressBar
                                                        current={item.spent}
                                                        total={item.planned}
                                                        height="h-1.5"
                                                        color={cfg.barColor}
                                                        className="mt-1"
                                                    />
                                                    <Text className="text-xs text-stone-400">Gastado {formatCurrency(item.spent, selectedCurrency)} · Dia {item.daysElapsed}/{item.daysInMonth}</Text>
                                                </View>
                                            )}
                                        </Card>
                                    );
                                })
                            }
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Footer */}
            {visibleItems.length > 0 && (
                <View className="p-5 bg-background-light dark:bg-background-dark border-t border-white/40 dark:border-slate-800">
                    <SafeAreaView edges={['bottom']}>
                        <Button
                            variant="primary"
                            size="lg"
                            fullWidth
                            loading={saving}
                            onPress={handleSave}
                        >
                            Guardar Plan
                        </Button>
                    </SafeAreaView>
                </View>
            )}

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
        </View>
    );
}
