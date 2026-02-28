import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { useAccountGoals } from '../src/hooks/useAccountGoals';
import { deleteAccountGoal, getCategoryAccountSum } from '../src/services/accountGoalsService';
import { emitAccountGoalsChange } from '../src/lib/events';
import { formatCurrency, getCategoryStyle, getCurrencySymbol } from '../src/lib/helpers';
import ConfirmModal from '../components/ConfirmModal';

export default function AccountDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { id, name, type, icon, color, balance, currency } = params;

    const { goals, loading } = useAccountGoals(id);
    const style = getCategoryStyle(color);

    const [deleteGoal, setDeleteGoal] = useState(null);
    const [categorySums, setCategorySums] = useState({});

    // Load category sums for category-type goals
    useEffect(() => {
        let cancelled = false;
        async function loadSums() {
            const sums = {};
            for (const goal of goals) {
                if (goal.goal_type === 'category' && goal.category_id) {
                    try {
                        sums[goal.id] = await getCategoryAccountSum(goal.category_id, id);
                    } catch {
                        sums[goal.id] = 0;
                    }
                }
            }
            if (!cancelled) setCategorySums(sums);
        }
        if (goals.length > 0) loadSums();
        return () => { cancelled = true; };
    }, [goals, id]);

    const confirmDelete = useCallback(async () => {
        if (!deleteGoal) return;
        try {
            await deleteAccountGoal(deleteGoal.id);
            emitAccountGoalsChange();
        } catch (e) {
            if (__DEV__) console.log('Delete goal error:', e.message);
        } finally {
            setDeleteGoal(null);
        }
    }, [deleteGoal]);

    const getProgress = useCallback((goal) => {
        if (goal.goal_type === 'balance') {
            const current = Number(balance) || 0;
            return { current, target: goal.target_amount, pct: goal.target_amount > 0 ? Math.min((current / goal.target_amount) * 100, 100) : 0 };
        }
        const current = categorySums[goal.id] ?? 0;
        return { current, target: goal.target_amount, pct: goal.target_amount > 0 ? Math.min((current / goal.target_amount) * 100, 100) : 0 };
    }, [balance, categorySums]);

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="px-4 pt-4 pb-4 bg-background-light/80 dark:bg-background-dark/80 border-b border-slate-200 dark:border-slate-800 z-10">
                <SafeAreaView edges={['top']} className="flex-row items-center justify-between h-12">
                    <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full active:bg-slate-200 dark:active:bg-slate-800">
                        <MaterialIcons name="arrow-back-ios-new" size={20} color="#475569" />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-slate-900 dark:text-white">Detalle de Cuenta</Text>
                    <View className="h-10 w-10" />
                </SafeAreaView>
            </View>

            <ScrollView className="flex-1 px-5 py-6">
                <View className="space-y-6 pb-24">
                    {/* Account info card */}
                    <View className="bg-white dark:bg-card-dark p-6 rounded-2xl border border-slate-200 dark:border-slate-800 items-center">
                        <View className={`h-16 w-16 rounded-2xl items-center justify-center mb-3 ${style.bg}`}>
                            <MaterialIcons name={icon || 'account-balance-wallet'} size={32} color={style.hex} />
                        </View>
                        <Text className="text-xl font-bold text-slate-900 dark:text-white">{name}</Text>
                        <Text className="text-xs text-slate-400 font-medium uppercase mt-1">{type} • {currency}</Text>
                        <Text className="text-3xl font-extrabold text-slate-900 dark:text-white mt-3">
                            {formatCurrency(balance, currency)}
                        </Text>
                    </View>

                    {/* Goals section */}
                    <View className="flex-row items-center justify-between">
                        <Text className="text-lg font-bold text-slate-900 dark:text-white">Metas</Text>
                        <TouchableOpacity
                            onPress={() => router.push({
                                pathname: '/add-account-goal',
                                params: { account_id: id, currency },
                            })}
                            className="bg-primary/10 px-4 py-2 rounded-full flex-row items-center gap-1"
                        >
                            <MaterialIcons name="add" size={16} color="#137fec" />
                            <Text className="text-xs font-bold text-primary">Agregar Meta</Text>
                        </TouchableOpacity>
                    </View>

                    {loading && <ActivityIndicator size="large" color="#137fec" />}

                    {!loading && goals.length === 0 && (
                        <View className="items-center py-12">
                            <MaterialIcons name="flag" size={48} color="#94a3b8" />
                            <Text className="text-slate-400 text-base font-medium mt-4">Sin metas configuradas</Text>
                            <Text className="text-slate-400 text-sm mt-1">Agrega una meta para esta cuenta</Text>
                        </View>
                    )}

                    <View className="space-y-4">
                        {goals.map(goal => {
                            const { current, target, pct } = getProgress(goal);
                            const isBalance = goal.goal_type === 'balance';
                            const goalIcon = isBalance ? 'savings' : (goal.category?.icon || 'category');
                            const goalColor = isBalance ? getCategoryStyle('primary') : getCategoryStyle(goal.category?.color);
                            const goalLabel = isBalance ? 'Meta de Saldo' : (goal.category?.name || 'Categoría');

                            return (
                                <View key={goal.id} className="bg-white dark:bg-card-dark p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                                    <View className="flex-row items-center gap-3 mb-3">
                                        <View className={`h-10 w-10 rounded-xl items-center justify-center ${goalColor.bg}`}>
                                            <MaterialIcons name={goalIcon} size={22} color={goalColor.hex} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-sm font-bold text-slate-900 dark:text-white">{goalLabel}</Text>
                                            {goal.target_date && (
                                                <Text className="text-xs text-slate-400 mt-0.5">Fecha: {goal.target_date}</Text>
                                            )}
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => setDeleteGoal(goal)}
                                            className="h-8 w-8 items-center justify-center rounded-full active:bg-red-100 dark:active:bg-red-500/20"
                                        >
                                            <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Progress */}
                                    <View className="flex-row justify-between mb-2">
                                        <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                            {formatCurrency(current, currency)}
                                        </Text>
                                        <Text className="text-sm font-semibold text-slate-400">
                                            / {formatCurrency(target, currency)}
                                        </Text>
                                    </View>
                                    <View className="relative h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <View
                                            className="absolute top-0 left-0 h-full rounded-full"
                                            style={{ width: `${pct}%`, backgroundColor: goalColor.hex }}
                                        />
                                    </View>
                                    <Text className="text-xs text-slate-400 font-medium mt-1.5 text-right">{Math.round(pct)}%</Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>

            <ConfirmModal
                visible={!!deleteGoal}
                title="Eliminar meta"
                message={deleteGoal ? `¿Eliminar esta meta de ${deleteGoal.goal_type === 'balance' ? 'saldo' : (deleteGoal.category?.name || 'categoría')}?` : ''}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteGoal(null)}
            />
        </View>
    );
}
