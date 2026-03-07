import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMemo } from 'react';
import { useSavingsGoals } from '../src/hooks/useSavingsGoals';
import { formatCurrency, getCategoryStyle } from '../src/lib/helpers';
import { goalProgress } from '../src/lib/goalHelpers';
import GoalCard from '../components/GoalCard';

export default function AccountDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { id, name, type, icon, color, balance, currency } = params;

    const { goals, loading } = useSavingsGoals(id);
    const style = getCategoryStyle(color);

    const activeGoals = useMemo(() => goals.filter(g => g.status === 'active'), [goals]);
    const avgProgress = useMemo(() => {
        if (activeGoals.length === 0) return 0;
        const sum = activeGoals.reduce((s, g) => s + goalProgress(g), 0);
        return Math.round(sum / activeGoals.length);
    }, [activeGoals]);

    const navigateToGoal = (goal) => {
        router.push({
            pathname: '/goal-detail',
            params: {
                id: goal.id,
                name: goal.name,
                target_amount: String(goal.target_amount),
                current_amount: String(goal.current_amount),
                currency: goal.currency,
                deadline: goal.deadline || '',
                status: goal.status,
                icon: goal.icon,
                color: goal.color,
                priority: String(goal.priority),
                created_at: goal.created_at,
            },
        });
    };

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="px-4 pt-4 pb-4 bg-background-light/80 dark:bg-background-dark/80 border-b border-white/40 dark:border-slate-800 z-10">
                <SafeAreaView edges={['top']} className="flex-row items-center justify-between h-12">
                    <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full active:bg-stone-200 dark:active:bg-slate-800">
                        <MaterialIcons name="arrow-back-ios-new" size={20} color="#475569" />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-stone-900 dark:text-white">Detalle de Cuenta</Text>
                    <View className="h-10 w-10" />
                </SafeAreaView>
            </View>

            <ScrollView className="flex-1 px-5 py-6">
                <View className="space-y-6 pb-24">
                    {/* Account info card */}
                    <View className="bg-white/75 dark:bg-card-dark p-6 rounded-2xl border border-white/60 dark:border-slate-800 shadow-sm items-center">
                        <View className={`h-16 w-16 rounded-2xl items-center justify-center mb-3 ${style.bg}`}>
                            <MaterialIcons name={icon || 'account-balance-wallet'} size={32} color={style.hex} />
                        </View>
                        <Text className="text-xl font-bold text-stone-900 dark:text-white">{name}</Text>
                        <Text className="text-xs text-stone-400 font-medium uppercase mt-1">{type} • {currency}</Text>
                        <Text className="text-3xl font-extrabold text-stone-900 dark:text-white mt-3">
                            {formatCurrency(balance, currency)}
                        </Text>
                    </View>

                    {/* Goals section */}
                    <View className="flex-row items-center justify-between">
                        <Text className="text-lg font-bold text-stone-900 dark:text-white">Metas</Text>
                        <TouchableOpacity
                            onPress={() => router.push({
                                pathname: '/add-goal',
                                params: { account_id: id, currency },
                            })}
                            className="bg-primary/10 px-4 py-2 rounded-full flex-row items-center gap-1"
                        >
                            <MaterialIcons name="add" size={16} color="#137fec" />
                            <Text className="text-xs font-bold text-primary">Agregar Meta</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Summary line */}
                    {activeGoals.length > 0 && (
                        <Text className="text-xs text-stone-400 font-medium -mt-2">
                            {activeGoals.length} meta{activeGoals.length !== 1 ? 's' : ''} activa{activeGoals.length !== 1 ? 's' : ''} — {avgProgress}% promedio
                        </Text>
                    )}

                    {loading && <ActivityIndicator size="large" color="#137fec" />}

                    {!loading && goals.length === 0 && (
                        <View className="items-center py-12">
                            <MaterialIcons name="flag" size={48} color="#a8a29e" />
                            <Text className="text-stone-400 text-base font-medium mt-4">Sin metas configuradas</Text>
                            <Text className="text-stone-400 text-sm mt-1">Agrega una meta para esta cuenta</Text>
                        </View>
                    )}

                    <View className="space-y-4">
                        {goals.map(goal => (
                            <GoalCard
                                key={goal.id}
                                goal={goal}
                                onPress={() => navigateToGoal(goal)}
                                currency={currency}
                            />
                        ))}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
