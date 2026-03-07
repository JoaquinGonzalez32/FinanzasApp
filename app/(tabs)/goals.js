import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useMemo, useCallback } from 'react';
import { FadeIn, FrostBackground } from '../../components/ui';
import { useAccounts } from '../../src/hooks/useAccounts';
import { useSavingsGoals } from '../../src/hooks/useSavingsGoals';
import { goalProgress } from '../../src/lib/goalHelpers';
import { formatCurrency, getCategoryStyle } from '../../src/lib/helpers';
import GoalCard from '../../components/GoalCard';

function StatusChip({ label, count, active, onPress }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            className={`flex-row items-center gap-1.5 px-3.5 py-2 rounded-full ${active ? 'bg-primary' : 'bg-white/75 dark:bg-card-dark border border-white/60 dark:border-slate-800'}`}
        >
            <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-stone-600 dark:text-slate-400'}`}>
                {label}
            </Text>
            {count > 0 && (
                <View className={`h-4.5 min-w-[18px] items-center justify-center rounded-full px-1 ${active ? 'bg-white/25' : 'bg-frost dark:bg-slate-800'}`}>
                    <Text className={`text-[10px] font-bold ${active ? 'text-white' : 'text-stone-500 dark:text-slate-400'}`}>{count}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

export default function GoalsScreen() {
    const router = useRouter();
    const { accounts } = useAccounts();
    const { goals: allGoals, loading: allLoading, refresh: refreshAll } = useSavingsGoals(null, 'all');
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('active');

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try { await refreshAll(); } finally { setRefreshing(false); }
    }, [refreshAll]);

    const filteredGoals = useMemo(() => {
        if (filter === 'all') return allGoals;
        return allGoals.filter(g => g.status === filter);
    }, [allGoals, filter]);

    const counts = useMemo(() => ({
        active: allGoals.filter(g => g.status === 'active').length,
        completed: allGoals.filter(g => g.status === 'completed').length,
        paused: allGoals.filter(g => g.status === 'paused').length,
    }), [allGoals]);

    const totalProgress = useMemo(() => {
        const active = allGoals.filter(g => g.status === 'active');
        if (active.length === 0) return 0;
        return Math.round(active.reduce((s, g) => s + goalProgress(g), 0) / active.length);
    }, [allGoals]);

    const accMap = useMemo(() => {
        const m = {};
        accounts.forEach(a => { m[a.id] = a; });
        return m;
    }, [accounts]);

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

    const hasAccounts = accounts.length > 0;

    return (
        <FrostBackground edges={['top']}>
            {/* Header */}
            <View className="px-5 pt-2 pb-3 flex-row items-center justify-between">
                <Text className="text-xl font-bold text-stone-900 dark:text-white">Metas</Text>
                {hasAccounts && (
                    <TouchableOpacity
                        onPress={() => {
                            // Navigate to first account's add-goal
                            const acc = accounts[0];
                            router.push({
                                pathname: '/add-goal',
                                params: { account_id: acc.id, currency: acc.currency ?? 'UYU' },
                            });
                        }}
                        className="h-9 w-9 rounded-full bg-primary/10 items-center justify-center"
                    >
                        <MaterialIcons name="add" size={20} color="#137fec" />
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#137fec" colors={['#137fec']} />
                }
            >
                {/* Summary header */}
                {counts.active > 0 && (
                    <FadeIn delay={100}>
                        <View className="px-5 pb-3">
                            <View className="bg-white/75 dark:bg-card-dark rounded-2xl border border-white/60 dark:border-slate-800 shadow-sm p-4 flex-row items-center gap-4">
                                <View className="h-12 w-12 rounded-2xl bg-primary/10 items-center justify-center">
                                    <MaterialIcons name="flag" size={24} color="#137fec" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm font-bold text-stone-900 dark:text-white">
                                        {counts.active} meta{counts.active !== 1 ? 's' : ''} activa{counts.active !== 1 ? 's' : ''}
                                    </Text>
                                    <Text className="text-xs text-stone-400 mt-0.5">
                                        Progreso promedio: {totalProgress}%
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </FadeIn>
                )}

                {/* Filter chips */}
                <FadeIn delay={150}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5 pb-4" contentContainerStyle={{ gap: 8 }}>
                        <StatusChip label="Activas" count={counts.active} active={filter === 'active'} onPress={() => setFilter('active')} />
                        <StatusChip label="Completadas" count={counts.completed} active={filter === 'completed'} onPress={() => setFilter('completed')} />
                        <StatusChip label="Pausadas" count={counts.paused} active={filter === 'paused'} onPress={() => setFilter('paused')} />
                        <StatusChip label="Todas" count={allGoals.length} active={filter === 'all'} onPress={() => setFilter('all')} />
                    </ScrollView>
                </FadeIn>

                {/* Loading */}
                {allLoading && !refreshing && (
                    <View className="py-12">
                        <ActivityIndicator size="large" color="#137fec" />
                    </View>
                )}

                {/* Empty state */}
                {!allLoading && filteredGoals.length === 0 && (
                    <FadeIn delay={200}>
                        <View className="items-center py-16 px-5">
                            <View className="h-20 w-20 rounded-3xl bg-frost dark:bg-input-dark items-center justify-center mb-4">
                                <MaterialIcons name="flag" size={36} color="#d6d3d1" />
                            </View>
                            <Text className="text-stone-900 dark:text-white text-base font-bold text-center">
                                {filter === 'active' ? 'Sin metas activas' : 'Sin metas'}
                            </Text>
                            <Text className="text-stone-400 text-sm mt-2 text-center">
                                {hasAccounts
                                    ? 'Crea tu primera meta de ahorro desde una cuenta'
                                    : 'Primero necesitas crear una cuenta'}
                            </Text>
                            {hasAccounts && (
                                <TouchableOpacity
                                    onPress={() => {
                                        const acc = accounts[0];
                                        router.push({
                                            pathname: '/add-goal',
                                            params: { account_id: acc.id, currency: acc.currency ?? 'UYU' },
                                        });
                                    }}
                                    className="mt-5 bg-primary px-6 py-3 rounded-xl flex-row items-center gap-2"
                                >
                                    <MaterialIcons name="add" size={18} color="white" />
                                    <Text className="text-white font-bold text-sm">Nueva Meta</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </FadeIn>
                )}

                {/* Goal cards grouped by account */}
                <View className="px-5 gap-3">
                    {filteredGoals.map((goal, i) => {
                        const acc = accMap[goal.account_id];
                        const prevGoal = filteredGoals[i - 1];
                        const showAccountHeader = !prevGoal || prevGoal.account_id !== goal.account_id;

                        return (
                            <FadeIn key={goal.id} delay={200 + i * 60}>
                                <View>
                                    {showAccountHeader && acc && (
                                        <View className="flex-row items-center gap-2 mb-2 mt-1">
                                            <View className={`h-5 w-5 rounded-md items-center justify-center ${getCategoryStyle(acc.color).bg}`}>
                                                <MaterialIcons name={acc.icon || 'account-balance-wallet'} size={12} color={getCategoryStyle(acc.color).hex} />
                                            </View>
                                            <Text className="text-xs font-semibold text-stone-400 uppercase tracking-wider">{acc.name}</Text>
                                        </View>
                                    )}
                                    <GoalCard
                                        goal={goal}
                                        onPress={() => navigateToGoal(goal)}
                                        currency={acc?.currency}
                                    />
                                </View>
                            </FadeIn>
                        );
                    })}
                </View>
            </ScrollView>
        </FrostBackground>
    );
}
