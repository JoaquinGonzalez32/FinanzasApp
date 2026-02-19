import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useMemo } from 'react';
import { useCategories } from '../src/hooks/useCategories';
import { createAccountGoal } from '../src/services/accountGoalsService';
import { emitAccountGoalsChange } from '../src/lib/events';
import { getCategoryStyle, getCurrencySymbol } from '../src/lib/helpers';

export default function AddAccountGoalScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { account_id, currency } = params;

    const { categories: expenseCategories } = useCategories('expense');

    const [goalType, setGoalType] = useState('balance');
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [targetAmount, setTargetAmount] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [saving, setSaving] = useState(false);

    // Filter categories by this account
    const filteredCategories = useMemo(
        () => expenseCategories.filter(c => !c.account_id || c.account_id === account_id),
        [expenseCategories, account_id]
    );

    const handleSave = async () => {
        const amount = Number(targetAmount);
        if (!amount || amount <= 0) {
            Alert.alert('Error', 'El monto debe ser mayor a 0');
            return;
        }
        if (goalType === 'category' && !selectedCategoryId) {
            Alert.alert('Error', 'Selecciona una categoría');
            return;
        }
        // Validate date format if provided
        if (targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
            Alert.alert('Error', 'Formato de fecha inválido (YYYY-MM-DD)');
            return;
        }

        setSaving(true);
        try {
            await createAccountGoal({
                account_id,
                goal_type: goalType,
                category_id: goalType === 'category' ? selectedCategoryId : null,
                target_amount: amount,
                target_date: targetDate || null,
            });
            emitAccountGoalsChange();
            router.back();
        } catch (e) {
            Alert.alert('Error', e.message || 'No se pudo guardar');
        } finally {
            setSaving(false);
        }
    };

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="px-4 pt-4 pb-4 bg-background-light/80 dark:bg-background-dark/80 border-b border-slate-200 dark:border-slate-800 z-10">
                <SafeAreaView edges={['top']} className="flex-row items-center justify-between h-12">
                    <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full active:bg-slate-200 dark:active:bg-slate-800">
                        <MaterialIcons name="arrow-back-ios-new" size={20} color="#475569" />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-slate-900 dark:text-white">Nueva Meta</Text>
                    <View className="h-10 w-10" />
                </SafeAreaView>
            </View>

            <ScrollView className="flex-1 px-5 py-6" keyboardShouldPersistTaps="handled">
                <View className="space-y-6 pb-24">
                    {/* Goal type toggle */}
                    <View>
                        <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Tipo de Meta</Text>
                        <View className="bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl flex-row">
                            <TouchableOpacity
                                onPress={() => setGoalType('balance')}
                                className={`flex-1 py-3 rounded-lg items-center ${goalType === 'balance' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
                            >
                                <MaterialIcons name="savings" size={20} color={goalType === 'balance' ? '#137fec' : '#94a3b8'} />
                                <Text className={`text-xs font-semibold mt-1 ${goalType === 'balance' ? 'text-primary' : 'text-slate-500'}`}>Meta de Saldo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setGoalType('category')}
                                className={`flex-1 py-3 rounded-lg items-center ${goalType === 'category' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
                            >
                                <MaterialIcons name="category" size={20} color={goalType === 'category' ? '#137fec' : '#94a3b8'} />
                                <Text className={`text-xs font-semibold mt-1 ${goalType === 'category' ? 'text-primary' : 'text-slate-500'}`}>Meta por Categoría</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Category selector (only for category type) */}
                    {goalType === 'category' && (
                        <View>
                            <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Categoría</Text>
                            <View className="flex-row flex-wrap gap-2">
                                {filteredCategories.map(cat => {
                                    const catStyle = getCategoryStyle(cat.color);
                                    const isSelected = selectedCategoryId === cat.id;
                                    return (
                                        <TouchableOpacity
                                            key={cat.id}
                                            onPress={() => setSelectedCategoryId(cat.id)}
                                            className={`flex-row items-center gap-2 px-3 py-2.5 rounded-xl border ${isSelected ? 'bg-primary/5 dark:bg-primary/10 border-primary/30' : 'bg-white dark:bg-card-dark border-slate-200 dark:border-slate-800'}`}
                                        >
                                            <View className={`h-7 w-7 rounded-lg items-center justify-center ${catStyle.bg}`}>
                                                <MaterialIcons name={cat.icon} size={16} color={catStyle.hex} />
                                            </View>
                                            <Text className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>{cat.name}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                                {filteredCategories.length === 0 && (
                                    <Text className="text-slate-400 text-sm">No hay categorías disponibles</Text>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Target amount */}
                    <View>
                        <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Monto Objetivo</Text>
                        <View className="flex-row items-center bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-800 px-4">
                            <Text className="text-xl font-bold text-slate-400 mr-2">{getCurrencySymbol(currency)}</Text>
                            <TextInput
                                value={targetAmount}
                                onChangeText={(v) => setTargetAmount(v.replace(/[^0-9.]/g, ''))}
                                keyboardType="numeric"
                                placeholder="0.00"
                                placeholderTextColor="#94a3b8"
                                className="flex-1 py-4 text-xl font-bold text-slate-900 dark:text-white"
                            />
                        </View>
                    </View>

                    {/* Target date (optional) */}
                    <View>
                        <Text className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Fecha Objetivo (opcional)</Text>
                        <View className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-800 px-4">
                            <TextInput
                                value={targetDate}
                                onChangeText={setTargetDate}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="#94a3b8"
                                maxLength={10}
                                className="py-4 text-base font-medium text-slate-900 dark:text-white"
                            />
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Save button */}
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
                            <Text className="text-white font-bold text-center text-lg">Guardar Meta</Text>
                        )}
                    </TouchableOpacity>
                </SafeAreaView>
            </View>
        </View>
    );
}
