import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from 'react-native';
import { showError } from '../src/lib/friendlyError';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useCallback, useMemo } from 'react';
import { useRecurring } from '../src/hooks/useRecurring';
import { useCategories } from '../src/hooks/useCategories';
import { useAccounts } from '../src/hooks/useAccounts';
import { formatCurrency, getCategoryStyle, getCurrencySymbol, toDateISO } from '../src/lib/helpers';
import { createRecurringExpense, deleteRecurringExpense } from '../src/services/recurringService';
import { createTransaction } from '../src/services/transactionsService';
import { emitRecurringChange, emitTransactionsChange } from '../src/lib/events';

export default function RecurringScreen() {
    const router = useRouter();
    const { templates, pendingItems, setPendingItems, loading, error } = useRecurring();
    const { categories: expenseCategories } = useCategories('expense');
    const { accounts } = useAccounts();

    const [confirming, setConfirming] = useState(false);
    const [saving, setSaving] = useState(false);
    const [addVisible, setAddVisible] = useState(false);
    const [catPickerVisible, setCatPickerVisible] = useState(false);

    // Add form state
    const [newCategory, setNewCategory] = useState(null);
    const [newAmount, setNewAmount] = useState('');
    const [newDay, setNewDay] = useState('1');
    const [newAccountId, setNewAccountId] = useState(null);

    const accCurrencyMap = useMemo(() => {
        const m = {};
        accounts.forEach(a => { m[a.id] = a.currency; });
        return m;
    }, [accounts]);

    const assignedCatIds = useMemo(
        () => new Set(templates.map(t => t.category_id)),
        [templates]
    );
    const availableCats = useMemo(
        () => expenseCategories.filter(c => !assignedCatIds.has(c.id)),
        [expenseCategories, assignedCatIds]
    );

    const handleUpdateAmount = useCallback((idx, value) => {
        setPendingItems(prev =>
            prev.map((item, i) => i === idx ? { ...item, editAmount: value.replace(/[^0-9]/g, '') } : item)
        );
    }, [setPendingItems]);

    const handleConfirmAll = useCallback(async () => {
        setConfirming(true);
        const today = toDateISO();
        try {
            for (const item of pendingItems) {
                const amount = Number(item.editAmount) || item.recurring.amount;
                await createTransaction({
                    amount,
                    type: 'expense',
                    category_id: item.recurring.category_id,
                    account_id: item.recurring.account_id ?? null,
                    date: today,
                    recurring_id: item.recurring.id,
                });
            }
            emitTransactionsChange();
            emitRecurringChange();
        } catch (e) {
            showError(e);
        } finally {
            setConfirming(false);
        }
    }, [pendingItems]);

    const handleDelete = useCallback(async (id) => {
        const confirmed = typeof window !== 'undefined' && window.confirm
            ? window.confirm('¿Eliminar este gasto recurrente?')
            : await new Promise(resolve =>
                Alert.alert('Eliminar plantilla', '¿Eliminar este gasto recurrente?', [
                    { text: 'Cancelar', onPress: () => resolve(false), style: 'cancel' },
                    { text: 'Eliminar', onPress: () => resolve(true), style: 'destructive' },
                ])
            );
        if (!confirmed) return;
        try {
            await deleteRecurringExpense(id);
            emitRecurringChange();
        } catch (e) {
            showError(e);
        }
    }, []);

    const resetAddForm = useCallback(() => {
        setNewCategory(null);
        setNewAmount('');
        setNewDay('1');
        setNewAccountId(null);
    }, []);

    const handleSaveNew = useCallback(async () => {
        if (!newCategory) return;
        const amount = Number(newAmount) || 0;
        const day = Math.max(1, Math.min(28, Number(newDay) || 1));
        setSaving(true);
        try {
            await createRecurringExpense({
                category_id: newCategory.id,
                account_id: newAccountId || null,
                amount,
                day_of_month: day,
            });
            emitRecurringChange();
            setAddVisible(false);
            resetAddForm();
        } catch (e) {
            showError(e);
        } finally {
            setSaving(false);
        }
    }, [newCategory, newAmount, newDay, newAccountId, resetAddForm]);

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
            <View className="px-4 pt-4 pb-4 bg-background-light/80 dark:bg-background-dark/80 border-b border-white/40 dark:border-slate-800 z-10">
                <SafeAreaView edges={['top']} className="flex-row items-center justify-between h-12">
                    <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full active:bg-stone-200 dark:active:bg-slate-800">
                        <MaterialIcons name="arrow-back-ios-new" size={20} color="#475569" />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-stone-900 dark:text-white">Gastos Recurrentes</Text>
                    <TouchableOpacity
                        onPress={() => setAddVisible(true)}
                        disabled={availableCats.length === 0}
                        className={`h-10 w-10 items-center justify-center rounded-full ${availableCats.length > 0 ? 'bg-primary/10' : 'bg-frost dark:bg-slate-800'}`}
                    >
                        <MaterialIcons name="add" size={24} color={availableCats.length > 0 ? '#137fec' : '#a8a29e'} />
                    </TouchableOpacity>
                </SafeAreaView>
            </View>

            <ScrollView className="flex-1 px-5 py-6" keyboardShouldPersistTaps="handled">
                <View className="space-y-6 pb-24">

                    {/* ── Pending this month ── */}
                    {pendingItems.length > 0 && (
                        <View className="space-y-3">
                            <View className="flex-row items-center justify-between">
                                <Text className="text-base font-bold text-stone-900 dark:text-white">Pendiente este mes</Text>
                                <View className="bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-full">
                                    <Text className="text-amber-600 text-xs font-bold">
                                        {pendingItems.length} pendiente{pendingItems.length !== 1 ? 's' : ''}
                                    </Text>
                                </View>
                            </View>

                            <View className="bg-white/75 dark:bg-card-dark rounded-2xl border border-white/60 dark:border-slate-800 shadow-md overflow-hidden">
                                {pendingItems.map((item, idx) => {
                                    const cat = item.recurring.category;
                                    const style = getCategoryStyle(cat?.color);
                                    return (
                                        <View
                                            key={item.recurring.id}
                                            className={`flex-row items-center gap-3 px-4 py-3 ${idx < pendingItems.length - 1 ? 'border-b border-stone-100 dark:border-slate-800' : ''}`}
                                        >
                                            <View className={`h-9 w-9 rounded-xl items-center justify-center ${style.bg}`}>
                                                <MaterialIcons name={cat?.icon || 'category'} size={18} color={style.hex} />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-sm font-bold text-stone-900 dark:text-white" numberOfLines={1}>
                                                    {cat?.name ?? 'Sin categoría'}
                                                </Text>
                                                <Text className="text-xs text-stone-400">Día {item.recurring.day_of_month}</Text>
                                            </View>
                                            <View className="flex-row items-center">
                                                <Text className="text-stone-400 font-bold text-sm mr-1">{getCurrencySymbol(accCurrencyMap[item.recurring.account_id])}</Text>
                                                <TextInput
                                                    value={item.editAmount}
                                                    onChangeText={v => handleUpdateAmount(idx, v)}
                                                    keyboardType="numeric"
                                                    maxLength={15}
                                                    className="w-24 h-9 bg-frost dark:bg-slate-800 rounded-lg text-center text-sm font-bold text-stone-900 dark:text-white"
                                                />
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>

                            <TouchableOpacity
                                onPress={handleConfirmAll}
                                disabled={confirming}
                                className={`w-full py-4 rounded-xl shadow-sm shadow-primary/20 active:scale-95 ${confirming ? 'bg-primary/60' : 'bg-primary'}`}
                            >
                                {confirming
                                    ? <ActivityIndicator color="white" />
                                    : <Text className="text-white font-bold text-center text-base">Confirmar gastos del mes</Text>
                                }
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* ── All templates ── */}
                    <View className="space-y-3">
                        <Text className="text-base font-bold text-stone-900 dark:text-white">Mis Plantillas</Text>

                        {error && (
                            <View className="bg-red-50 dark:bg-red-500/10 rounded-xl p-4 border border-red-200 dark:border-red-900/30">
                                <Text className="text-red-500 text-sm font-medium">{error}</Text>
                            </View>
                        )}

                        {templates.length === 0 ? (
                            <View className="items-center py-12">
                                <MaterialIcons name="repeat" size={48} color="#a8a29e" />
                                <Text className="text-stone-400 text-base font-medium mt-4 text-center">Sin gastos recurrentes</Text>
                                <Text className="text-stone-400 text-sm text-center mt-1">Alquiler, servicios, suscripciones...</Text>
                                <TouchableOpacity onPress={() => setAddVisible(true)} className="mt-5 bg-primary/10 px-5 py-2.5 rounded-full">
                                    <Text className="text-primary font-bold text-sm">Agregar plantilla</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View className="bg-white/75 dark:bg-card-dark rounded-2xl border border-white/60 dark:border-slate-800 shadow-md overflow-hidden">
                                {templates.map((item, idx) => {
                                    const cat = item.category;
                                    const style = getCategoryStyle(cat?.color);
                                    const isPending = pendingItems.some(p => p.recurring.id === item.id);
                                    return (
                                        <View
                                            key={item.id}
                                            className={`flex-row items-center gap-3 px-4 py-4 ${idx < templates.length - 1 ? 'border-b border-stone-100 dark:border-slate-800' : ''}`}
                                        >
                                            <View className={`h-10 w-10 rounded-xl items-center justify-center ${style.bg}`}>
                                                <MaterialIcons name={cat?.icon || 'category'} size={20} color={style.hex} />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-sm font-bold text-stone-900 dark:text-white" numberOfLines={1}>
                                                    {cat?.name ?? 'Sin categoría'}
                                                </Text>
                                                <Text className="text-xs text-stone-400">
                                                    Día {item.day_of_month} · {formatCurrency(item.amount, accCurrencyMap[item.account_id])}
                                                </Text>
                                            </View>
                                            {isPending ? (
                                                <View className="bg-amber-50 dark:bg-amber-500/10 px-2 py-1 rounded-full mr-2">
                                                    <Text className="text-amber-600 text-[10px] font-bold">Pendiente</Text>
                                                </View>
                                            ) : (
                                                <View className="bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full mr-2">
                                                    <Text className="text-emerald-600 text-[10px] font-bold">Aplicado</Text>
                                                </View>
                                            )}
                                            <TouchableOpacity
                                                onPress={() => handleDelete(item.id)}
                                                className="h-8 w-8 items-center justify-center rounded-full active:bg-red-100 dark:active:bg-red-500/20"
                                            >
                                                <MaterialIcons name="close" size={18} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* ── Add Template Modal ── */}
            <Modal visible={addVisible} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-background-light dark:bg-background-dark rounded-t-3xl">
                        <View className="flex-row items-center justify-between px-5 pt-5 pb-4 border-b border-white/40 dark:border-slate-800">
                            <Text className="text-base font-bold text-stone-900 dark:text-white">Nueva plantilla</Text>
                            <TouchableOpacity
                                onPress={() => { setAddVisible(false); resetAddForm(); }}
                                className="h-8 w-8 items-center justify-center rounded-full bg-frost dark:bg-slate-800"
                            >
                                <MaterialIcons name="close" size={20} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="px-5 py-5" keyboardShouldPersistTaps="handled">
                            <View className="space-y-5 pb-8">

                                {/* Category picker */}
                                <View>
                                    <Text className="text-xs font-bold text-stone-500 uppercase mb-2">Categoría</Text>
                                    <TouchableOpacity
                                        onPress={() => setCatPickerVisible(true)}
                                        className="flex-row items-center gap-3 p-4 bg-white/75 dark:bg-card-dark rounded-2xl border border-white/60 dark:border-slate-800 shadow-md"
                                    >
                                        {newCategory ? (
                                            <>
                                                <View className={`h-9 w-9 rounded-xl items-center justify-center ${getCategoryStyle(newCategory.color).bg}`}>
                                                    <MaterialIcons name={newCategory.icon} size={20} color={getCategoryStyle(newCategory.color).hex} />
                                                </View>
                                                <Text className="flex-1 text-sm font-bold text-stone-900 dark:text-white">{newCategory.name}</Text>
                                            </>
                                        ) : (
                                            <>
                                                <View className="h-9 w-9 rounded-xl items-center justify-center bg-frost dark:bg-slate-800">
                                                    <MaterialIcons name="category" size={20} color="#a8a29e" />
                                                </View>
                                                <Text className="flex-1 text-sm text-stone-400">Seleccionar categoría</Text>
                                            </>
                                        )}
                                        <MaterialIcons name="chevron-right" size={20} color="#a8a29e" />
                                    </TouchableOpacity>
                                </View>

                                {/* Amount + Day row */}
                                <View className="flex-row gap-3">
                                    <View className="flex-1">
                                        <Text className="text-xs font-bold text-stone-500 uppercase mb-2">Monto</Text>
                                        <View className="flex-row items-center bg-white/75 dark:bg-card-dark rounded-2xl border border-white/60 dark:border-slate-800 shadow-md px-4 h-14">
                                            <Text className="text-stone-400 font-bold mr-1">{getCurrencySymbol(accCurrencyMap[newAccountId])}</Text>
                                            <TextInput
                                                value={newAmount}
                                                onChangeText={v => setNewAmount(v.replace(/[^0-9]/g, ''))}
                                                keyboardType="numeric"
                                                placeholder="0"
                                                placeholderTextColor="#a8a29e"
                                                maxLength={15}
                                                className="flex-1 text-base font-bold text-stone-900 dark:text-white"
                                            />
                                        </View>
                                    </View>
                                    <View style={{ width: 120 }}>
                                        <Text className="text-xs font-bold text-stone-500 uppercase mb-2">Día del mes</Text>
                                        <View className="flex-row items-center justify-center bg-white/75 dark:bg-card-dark rounded-2xl border border-white/60 dark:border-slate-800 shadow-md h-14 px-4">
                                            <TextInput
                                                value={newDay}
                                                onChangeText={v => setNewDay(v.replace(/[^0-9]/g, ''))}
                                                keyboardType="numeric"
                                                placeholder="1"
                                                placeholderTextColor="#a8a29e"
                                                maxLength={2}
                                                className="flex-1 text-base font-bold text-stone-900 dark:text-white text-center"
                                            />
                                        </View>
                                        <Text className="text-[10px] text-stone-400 text-center mt-1">Entre 1 y 28</Text>
                                    </View>
                                </View>

                                {/* Account selector (optional) */}
                                {accounts.length > 0 && (
                                    <View>
                                        <Text className="text-xs font-bold text-stone-500 uppercase mb-2">Cuenta (opcional)</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                            {accounts.map(acc => {
                                                const isActive = newAccountId === acc.id;
                                                return (
                                                    <TouchableOpacity
                                                        key={acc.id}
                                                        onPress={() => setNewAccountId(isActive ? null : acc.id)}
                                                        className={`flex-row items-center gap-2 mr-3 px-4 py-3 rounded-xl ${isActive ? 'bg-primary/10 border border-primary/20' : 'bg-frost dark:bg-input-dark'}`}
                                                    >
                                                        <MaterialIcons name={acc.icon || 'account-balance-wallet'} size={18} color={isActive ? '#137fec' : '#475569'} />
                                                        <Text className={`text-sm font-bold ${isActive ? 'text-primary' : 'text-stone-600 dark:text-slate-400'}`}>{acc.name}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>
                                )}

                                {/* Save */}
                                <TouchableOpacity
                                    onPress={handleSaveNew}
                                    disabled={!newCategory || saving}
                                    className={`w-full py-4 rounded-xl active:scale-95 ${!newCategory || saving ? 'bg-primary/40' : 'bg-primary'}`}
                                >
                                    {saving
                                        ? <ActivityIndicator color="white" />
                                        : <Text className="text-white font-bold text-center text-base">Guardar plantilla</Text>
                                    }
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                        <SafeAreaView edges={['bottom']} />
                    </View>
                </View>
            </Modal>

            {/* ── Category Picker Modal (stacked on top of add modal) ── */}
            <Modal visible={catPickerVisible} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-background-light dark:bg-background-dark rounded-t-3xl max-h-[60%]">
                        <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
                            <Text className="text-lg font-bold text-stone-900 dark:text-white">Seleccionar categoría</Text>
                            <TouchableOpacity onPress={() => setCatPickerVisible(false)} className="h-8 w-8 items-center justify-center rounded-full bg-frost dark:bg-slate-800">
                                <MaterialIcons name="close" size={20} color="#64748b" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView className="px-5 pb-8">
                            {availableCats.length === 0 ? (
                                <View className="items-center py-8">
                                    <MaterialIcons name="check-circle" size={40} color="#10b981" />
                                    <Text className="text-stone-400 text-sm font-medium mt-3 text-center">
                                        Todas las categorías ya tienen plantilla recurrente
                                    </Text>
                                </View>
                            ) : (
                                <View className="space-y-2 pb-8">
                                    {availableCats.map(cat => {
                                        const style = getCategoryStyle(cat.color);
                                        return (
                                            <TouchableOpacity
                                                key={cat.id}
                                                onPress={() => { setNewCategory(cat); setCatPickerVisible(false); }}
                                                className="flex-row items-center gap-3 p-4 bg-white/75 dark:bg-card-dark rounded-2xl border border-white/60 dark:border-slate-800 shadow-md active:bg-stone-50 dark:active:bg-slate-800"
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
        </View>
    );
}
