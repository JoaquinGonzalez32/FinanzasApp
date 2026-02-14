import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useBudget } from '../src/hooks/useBudget';
import { useCategories } from '../src/hooks/useCategories';
import { useTransactions } from '../src/hooks/useTransactions';
import { formatCurrency, getCategoryStyle } from '../src/lib/helpers';
import { emitBudgetChange } from '../src/lib/events';
import * as svc from '../src/services/budgetService';

export default function PlanningScreen() {
    const router = useRouter();
    const { budgetItems, loading } = useBudget();
    const { categories: expenseCategories } = useCategories('expense');
    const { transactions } = useTransactions({ mode: 'month' });

    const monthIncome = useMemo(
        () => transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
        [transactions]
    );

    // Local editable state
    const [items, setItems] = useState([]);
    const [removedIds, setRemovedIds] = useState([]);
    const [showPercent, setShowPercent] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pickerVisible, setPickerVisible] = useState(false);

    // Sync DB items to local state on load
    useEffect(() => {
        if (!loading && budgetItems.length > 0 && items.length === 0) {
            setItems(budgetItems.map(b => ({ ...b, _local: false })));
        }
    }, [loading, budgetItems]);

    // Category IDs already assigned
    const assignedCategoryIds = useMemo(
        () => new Set(items.map(i => i.category_id)),
        [items]
    );

    // Available categories (not yet assigned)
    const availableCategories = useMemo(
        () => expenseCategories.filter(c => !assignedCategoryIds.has(c.id)),
        [expenseCategories, assignedCategoryIds]
    );

    const totalPercent = useMemo(() => items.reduce((s, i) => s + Number(i.percentage || 0), 0), [items]);

    const updateItem = useCallback((idx, field, value) => {
        setItems(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], [field]: value };
            return next;
        });
    }, []);

    const removeItem = useCallback((idx) => {
        setItems(prev => {
            const item = prev[idx];
            if (item.id && !item._local) {
                setRemovedIds(r => [...r, item.id]);
            }
            return prev.filter((_, i) => i !== idx);
        });
    }, []);

    const addCategory = useCallback((category) => {
        setItems(prev => [
            ...prev,
            {
                category_id: category.id,
                category: category,
                percentage: 0,
                sort_order: prev.length,
                _local: true,
            },
        ]);
        setPickerVisible(false);
    }, []);

    const handleSave = useCallback(async () => {
        setSaving(true);
        try {
            // Delete removed items
            for (const id of removedIds) {
                await svc.deleteBudgetItem(id);
            }
            // Create/update remaining items
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                const payload = {
                    category_id: item.category_id,
                    percentage: Number(item.percentage) || 0,
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
    }, [items, removedIds, router]);

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
                    {/* Toggle */}
                    <View className="bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl flex-row">
                        <TouchableOpacity
                            onPress={() => setShowPercent(true)}
                            className={`flex-1 py-2 rounded-lg items-center ${showPercent ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
                        >
                            <Text className={`text-sm font-semibold ${showPercent ? 'text-primary' : 'text-slate-500'}`}>Porcentaje</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setShowPercent(false)}
                            className={`flex-1 py-2 rounded-lg items-center ${!showPercent ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
                        >
                            <Text className={`text-sm font-semibold ${!showPercent ? 'text-primary' : 'text-slate-500'}`}>Montos fijos</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Items list */}
                    {items.length === 0 && (
                        <View className="items-center py-12">
                            <MaterialIcons name="pie-chart-outline" size={48} color="#94a3b8" />
                            <Text className="text-slate-400 text-base font-medium mt-4">Sin distribución configurada</Text>
                            <TouchableOpacity onPress={() => setPickerVisible(true)} className="mt-4 bg-primary/10 px-5 py-2 rounded-full">
                                <Text className="text-primary font-bold text-sm">Agregar categoría</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View className="space-y-4">
                        {items.map((item, idx) => {
                            const cat = item.category;
                            const style = getCategoryStyle(cat?.color);
                            const displayValue = showPercent
                                ? `${item.percentage ?? ''}`
                                : monthIncome > 0
                                    ? formatCurrency(monthIncome * (Number(item.percentage) || 0) / 100)
                                    : '$0.00';

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
                                        {showPercent ? (
                                            <View className="flex-row items-center">
                                                <TextInput
                                                    value={String(item.percentage ?? '')}
                                                    onChangeText={(v) => updateItem(idx, 'percentage', v.replace(/[^0-9.]/g, ''))}
                                                    keyboardType="numeric"
                                                    className="w-16 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg text-center text-base font-bold text-slate-900 dark:text-white"
                                                    maxLength={5}
                                                />
                                                <Text className="text-slate-400 font-bold text-base ml-1">%</Text>
                                            </View>
                                        ) : (
                                            <Text className="text-base font-bold text-slate-900 dark:text-white">{displayValue}</Text>
                                        )}

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
                    {items.length > 0 && (
                        <View className={`rounded-2xl p-6 border ${Math.abs(totalPercent - 100) < 0.01 ? 'bg-primary/5 dark:bg-primary/10 border-primary/20' : 'bg-amber-50 dark:bg-amber-500/10 border-amber-300/30'}`}>
                            <View className="flex-row justify-between items-end mb-4">
                                <View>
                                    <Text className={`text-xs font-bold uppercase ${Math.abs(totalPercent - 100) < 0.01 ? 'text-primary' : 'text-amber-600'}`}>Total Asignado</Text>
                                    <Text className={`text-3xl font-extrabold ${Math.abs(totalPercent - 100) < 0.01 ? 'text-primary' : 'text-amber-600'}`}>{totalPercent}%</Text>
                                </View>
                                {Math.abs(totalPercent - 100) >= 0.01 && (
                                    <View className="flex-row items-center gap-1">
                                        <MaterialIcons name="warning" size={16} color="#d97706" />
                                        <Text className="text-xs font-semibold text-amber-600">
                                            {totalPercent > 100 ? `Excede por ${(totalPercent - 100).toFixed(1)}%` : `Faltan ${(100 - totalPercent).toFixed(1)}%`}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <View className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex-row">
                                {items.map((item, idx) => {
                                    const style = getCategoryStyle(item.category?.color);
                                    const pct = Number(item.percentage) || 0;
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
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Footer */}
            {items.length > 0 && (
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
