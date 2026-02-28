import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useBudget } from '../src/hooks/useBudget';
import { useCategories } from '../src/hooks/useCategories';
import { useTransactions } from '../src/hooks/useTransactions';
import { useAccounts } from '../src/hooks/useAccounts';
import { formatCurrency, getCategoryStyle, getCurrentMonth, parseMonth, shiftMonth, monthLabel } from '../src/lib/helpers';
import { emitBudgetChange } from '../src/lib/events';
import * as svc from '../src/services/budgetService';

export default function PlanningScreen() {
    const router = useRouter();
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
    const { budgetItems, loading } = useBudget(selectedMonth);
    const { categories: expenseCategories } = useCategories('expense');

    const { year: txYear, month: txMonth } = parseMonth(selectedMonth);
    const { transactions } = useTransactions({ mode: 'month', year: txYear, month: txMonth });
    const { accounts } = useAccounts();

    const [selectedAccountId, setSelectedAccountId] = useState(null);

    // Auto-select first account once loaded
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

    // Local editable state
    const [items, setItems] = useState([]);
    const [removedIds, setRemovedIds] = useState([]);
    const [saving, setSaving] = useState(false);
    const [pickerVisible, setPickerVisible] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Sync DB items → local state (only when user has no unsaved edits)
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

    // Reset dirty flag and local state when month changes (unblocks sync for new month)
    useEffect(() => {
        setIsDirty(false);
        setItems([]);
        setRemovedIds([]);
    }, [selectedMonth]);

    // Visible items: all items filtered by selected account
    const visibleItems = useMemo(
        () => items.filter(item => !item.account_id || item.account_id === selectedAccountId),
        [items, selectedAccountId]
    );

    // Category IDs already assigned (from visible items)
    const assignedCategoryIds = useMemo(
        () => new Set(visibleItems.map(i => i.category_id)),
        [visibleItems]
    );

    // Available categories (not yet assigned + matching or unlinked account)
    const availableCategories = useMemo(
        () => expenseCategories.filter(c =>
            !assignedCategoryIds.has(c.id) &&
            (!c.account_id || c.account_id === selectedAccountId)
        ),
        [expenseCategories, assignedCategoryIds, selectedAccountId]
    );

    const totalAmount = useMemo(
        () => visibleItems.reduce((s, i) => s + (Number(i._fixedAmount) || 0), 0),
        [visibleItems]
    );

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
            // Delete removed items
            for (const id of removedIds) {
                await svc.deleteBudgetItem(id);
            }
            // Create/update visible items
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
            Alert.alert('Error', e.message || 'No se pudo guardar');
        } finally {
            setSaving(false);
        }
    }, [visibleItems, removedIds, router, selectedMonth]);

    if (loading) {
        return (
            <View className="flex-1 bg-background-light dark:bg-background-dark items-center justify-center">
                <ActivityIndicator size="large" color="#137fec" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="px-4 pt-4 pb-4 bg-background-light/80 dark:bg-background-dark/80 border-b border-slate-200 dark:border-slate-800 z-10">
                <SafeAreaView edges={['top']} className="flex-row items-center justify-between h-12">
                    <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full active:bg-slate-200 dark:active:bg-slate-800">
                        <MaterialIcons name="arrow-back-ios-new" size={20} color="#475569" />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-slate-900 dark:text-white">Planificación</Text>
                    <TouchableOpacity
                        onPress={() => setPickerVisible(true)}
                        disabled={availableCategories.length === 0}
                        className={`h-10 w-10 items-center justify-center rounded-full ${availableCategories.length > 0 ? 'bg-primary/10' : 'bg-slate-100 dark:bg-slate-800'}`}
                    >
                        <MaterialIcons name="add" size={24} color={availableCategories.length > 0 ? '#137fec' : '#94a3b8'} />
                    </TouchableOpacity>
                </SafeAreaView>
            </View>

            <ScrollView className="flex-1 px-5 py-6" keyboardShouldPersistTaps="handled">
                <View className="space-y-6 pb-24">
                    {/* Month selector */}
                    <View className="flex-row items-center justify-center gap-4">
                        <TouchableOpacity onPress={() => setSelectedMonth(m => shiftMonth(m, -1))} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 active:bg-slate-200">
                            <MaterialIcons name="chevron-left" size={24} color="#475569" />
                        </TouchableOpacity>
                        <Text className="text-base font-bold text-slate-900 dark:text-white min-w-[160px] text-center">
                            {monthLabel(selectedMonth)}
                        </Text>
                        <TouchableOpacity
                            onPress={() => setSelectedMonth(m => shiftMonth(m, 1))}
                            className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 active:bg-slate-200"
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
                                        className={`flex-row items-center gap-2 mr-3 px-4 py-3 rounded-xl ${isActive ? 'bg-primary/10 border border-primary/20' : 'bg-slate-100 dark:bg-input-dark'}`}
                                    >
                                        <MaterialIcons name={acc.icon || 'account-balance-wallet'} size={20} color={isActive ? '#137fec' : '#475569'} />
                                        <Text className={`text-sm font-bold ${isActive ? 'text-primary' : 'text-slate-600 dark:text-slate-400'}`}>{acc.name}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}

                    {/* Items list */}
                    {visibleItems.length === 0 && (
                        <View className="items-center py-12">
                            <MaterialIcons name="pie-chart-outline" size={48} color="#94a3b8" />
                            <Text className="text-slate-400 text-base font-medium mt-4">Sin distribución configurada</Text>
                            <TouchableOpacity onPress={() => setPickerVisible(true)} className="mt-4 bg-primary/10 px-5 py-2 rounded-full">
                                <Text className="text-primary font-bold text-sm">Agregar categoría</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View className="space-y-4">
                        {visibleItems.map((item, idx) => {
                            const cat = item.category;
                            const style = getCategoryStyle(cat?.color);
                            return (
                                <View key={item.id || `local-${idx}`} className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                                    <View className="flex-row items-center gap-3">
                                        {/* Icon */}
                                        <View className={`h-10 w-10 rounded-xl items-center justify-center ${style.bg}`}>
                                            <MaterialIcons name={cat?.icon || 'category'} size={22} color={style.hex} />
                                        </View>

                                        {/* Name */}
                                        <Text className="flex-1 text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                                            {cat?.name || 'Sin categoría'}
                                        </Text>

                                        {/* Value input */}
                                        <View className="flex-row items-center">
                                            <Text className="text-slate-400 font-bold text-base mr-1">$</Text>
                                            <TextInput
                                                value={item._fixedAmount ?? ''}
                                                onChangeText={(v) => {
                                                    const clean = v.replace(/[^0-9]/g, '');
                                                    updateItem(idx, '_fixedAmount', clean);
                                                }}
                                                keyboardType="numeric"
                                                className="w-24 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg text-center text-base font-bold text-slate-900 dark:text-white"
                                            />
                                        </View>

                                        {/* Delete */}
                                        <TouchableOpacity onPress={() => removeItem(idx)} className="h-8 w-8 items-center justify-center rounded-full active:bg-red-100 dark:active:bg-red-500/20 ml-1">
                                            <MaterialIcons name="close" size={18} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {/* Total bar */}
                    {visibleItems.length > 0 && (
                        <View className={`rounded-2xl p-6 border ${monthIncome > 0 && totalAmount <= monthIncome ? 'bg-primary/5 dark:bg-primary/10 border-primary/20' : 'bg-amber-50 dark:bg-amber-500/10 border-amber-300/30'}`}>
                            <View className="flex-row justify-between items-end mb-4">
                                <View>
                                    <Text className={`text-xs font-bold uppercase ${monthIncome > 0 && totalAmount <= monthIncome ? 'text-primary' : 'text-amber-600'}`}>Total Asignado</Text>
                                    <Text className={`text-3xl font-extrabold ${monthIncome > 0 && totalAmount <= monthIncome ? 'text-primary' : 'text-amber-600'}`}>{formatCurrency(totalAmount)}</Text>
                                </View>
                                {monthIncome > 0 && (
                                    <View className="items-end">
                                        <Text className="text-xs font-semibold text-slate-400">
                                            de {formatCurrency(monthIncome)}
                                        </Text>
                                        <Text className={`text-xs font-bold ${totalAmount > monthIncome ? 'text-amber-600' : 'text-emerald-500'}`}>
                                            {totalAmount > monthIncome ? `Excede ${formatCurrency(totalAmount - monthIncome)}` : `Disponible ${formatCurrency(monthIncome - totalAmount)}`}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            {monthIncome > 0 && (
                                <View className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex-row">
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
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Footer */}
            {visibleItems.length > 0 && (
                <View className="p-6 bg-background-light dark:bg-background-dark border-t border-slate-200 dark:border-slate-800">
                    <SafeAreaView edges={['bottom']}>
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={saving}
                            className={`w-full py-4 rounded-xl shadow-lg shadow-primary/20 active:scale-95 ${saving ? 'bg-primary/60' : 'bg-primary'}`}
                        >
                            {saving ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-bold text-center text-lg">Guardar Plan</Text>
                            )}
                        </TouchableOpacity>
                    </SafeAreaView>
                </View>
            )}

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
        </View>
    );
}
