import { View, Text, ScrollView, TouchableOpacity, RefreshControl, useColorScheme } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState, useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FrostBackground, FadeIn, MetricCard, SkeletonLoader } from '../components/ui';
import { useAnalytics } from '../src/features/analytics/hooks/useAnalytics';
import { useTrends } from '../src/features/analytics/hooks/useTrends';
import { useInsights } from '../src/features/analytics/hooks/useInsights';
import { buildDistributionSlices } from '../src/features/analytics/services/aggregation';
import EvolutionChart from '../src/features/analytics/components/charts/EvolutionChart';
import DistributionPie from '../src/features/analytics/components/charts/DistributionPie';
import CategoryLinesChart from '../src/features/analytics/components/charts/CategoryLinesChart';
import InsightCard from '../src/features/analytics/components/cards/InsightCard';
import { formatCurrency, monthLabel } from '../src/lib/helpers';
import { useAccounts } from '../src/hooks/useAccounts';


const TIME_RANGES = ['3M', '6M', '12M', 'ALL'];

export default function AnalyticsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const isDark = useColorScheme() === 'dark';
    const { accounts } = useAccounts();
    const primaryCurrency = accounts[0]?.currency;

    const {
        summaries, evolutionData, currentSummary, previousSummary,
        loading, error, timeRange, setTimeRange, refresh, hasEnoughData, months,
    } = useAnalytics();

    const { categoryTrends, globalTrend } = useTrends(summaries);
    const { insights, dismiss, activeCount } = useInsights(summaries, primaryCurrency);

    const [refreshing, setRefreshing] = useState(false);
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try { await refresh(); } finally { setRefreshing(false); }
    }, [refresh]);

    const distributionSlices = useMemo(
        () => currentSummary ? buildDistributionSlices(currentSummary) : [],
        [currentSummary],
    );

    const expenseChange = previousSummary && previousSummary.totalExpense > 0
        ? ((currentSummary?.totalExpense ?? 0) - previousSummary.totalExpense) / previousSummary.totalExpense * 100
        : null;

    const bestCategory = useMemo(() => {
        if (!currentSummary) return null;
        const expenses = currentSummary.byCategory.filter(c => c.type === 'expense' && c.budgetUsage !== null);
        if (expenses.length === 0) return null;
        return expenses.reduce((best, c) => (!best || (c.budgetUsage ?? 999) < (best.budgetUsage ?? 999)) ? c : best, null);
    }, [currentSummary]);

    const worstCategory = useMemo(() => {
        if (!currentSummary) return null;
        const expenses = currentSummary.byCategory.filter(c => c.type === 'expense' && c.budgetUsage !== null);
        if (expenses.length === 0) return null;
        return expenses.reduce((worst, c) => (!worst || (c.budgetUsage ?? 0) > (worst.budgetUsage ?? 0)) ? c : worst, null);
    }, [currentSummary]);


    return (
        <FrostBackground edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
                <TouchableOpacity onPress={() => router.back()} hitSlop={8} className="h-10 w-10 items-center justify-center">
                    <MaterialIcons name="arrow-back" size={22} color={isDark ? '#fff' : '#292524'} />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-stone-900 dark:text-white">Analisis</Text>
                <View className="h-10 w-10" />
            </View>

            {/* Time range selector */}
            <View className="flex-row items-center justify-center gap-2 px-5 pb-3">
                {TIME_RANGES.map((r) => (
                    <TouchableOpacity
                        key={r}
                        onPress={() => setTimeRange(r)}
                        className={`px-4 py-1.5 rounded-full ${timeRange === r
                            ? 'bg-primary'
                            : 'bg-frost dark:bg-input-dark'}`}
                    >
                        <Text className={`text-xs font-bold ${timeRange === r
                            ? 'text-white'
                            : 'text-stone-500 dark:text-slate-400'}`}>
                            {r === 'ALL' ? 'Todo' : r}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" colors={['#6366F1']} />
                }
            >
                {loading && !refreshing ? (
                    <View className="px-5 pt-4 gap-4">
                        <SkeletonLoader.Card lines={2} />
                        <SkeletonLoader.Card lines={4} />
                        <SkeletonLoader.Card lines={3} />
                    </View>
                ) : error ? (
                    <View className="px-5 pt-4">
                        <View className="bg-red-50 dark:bg-red-500/8 rounded-2xl p-4 flex-row items-center gap-3 border border-red-100 dark:border-red-900/20">
                            <MaterialIcons name="error-outline" size={18} color="#ef4444" />
                            <Text className="text-red-500 text-xs flex-1 font-medium">{error}</Text>
                            <TouchableOpacity onPress={onRefresh}>
                                <Text className="text-primary font-bold text-xs">Reintentar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <>
                        {/* KPI Cards */}
                        <FadeIn delay={50}>
                            <View className="flex-row gap-3 px-5 pb-4">
                                <MetricCard
                                    className="flex-1"
                                    label="Gasto total"
                                    value={formatCurrency(currentSummary?.totalExpense ?? 0, primaryCurrency)}
                                    trend={expenseChange !== null ? (expenseChange > 5 ? 'down' : expenseChange < -5 ? 'up' : 'neutral') : undefined}
                                    context={expenseChange !== null ? `${Math.abs(Math.round(expenseChange))}% vs mes ant.` : undefined}
                                    icon="payments"
                                    iconBg="bg-red-500/10"
                                    iconColor="#ef4444"
                                />
                            </View>
                        </FadeIn>

                        {/* Best / Worst category */}
                        {(bestCategory || worstCategory) && (
                            <FadeIn delay={100}>
                                <View className="flex-row gap-3 px-5 pb-4">
                                    {bestCategory && (
                                        <MetricCard
                                            className="flex-1"
                                            label="Mejor control"
                                            value={bestCategory.categoryName}
                                            context={`${Math.round(bestCategory.budgetUsage ?? 0)}% del presupuesto`}
                                            icon={bestCategory.categoryIcon}
                                            iconBg="bg-emerald-500/10"
                                            iconColor="#10b981"
                                            trend="up"
                                        />
                                    )}
                                    {worstCategory && (
                                        <MetricCard
                                            className="flex-1"
                                            label="Mayor exceso"
                                            value={worstCategory.categoryName}
                                            context={`${Math.round(worstCategory.budgetUsage ?? 0)}% del presupuesto`}
                                            icon={worstCategory.categoryIcon}
                                            iconBg="bg-red-500/10"
                                            iconColor="#ef4444"
                                            trend="down"
                                        />
                                    )}
                                </View>
                            </FadeIn>
                        )}

                        {/* Insights */}
                        {insights.length > 0 && (
                            <FadeIn delay={150}>
                                <View className="px-5 pb-4 gap-2">
                                    <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500 mb-1">
                                        Insights ({activeCount})
                                    </Text>
                                    {insights.slice(0, 4).map((insight) => (
                                        <InsightCard
                                            key={insight.id}
                                            insight={insight}
                                            onDismiss={dismiss}
                                        />
                                    ))}
                                </View>
                            </FadeIn>
                        )}

                        {/* Not enough data message */}
                        {!hasEnoughData && (
                            <FadeIn delay={150}>
                                <View className="mx-5 mb-4 bg-primary/5 dark:bg-primary/8 rounded-2xl p-4 border border-primary/10">
                                    <View className="flex-row items-center gap-3">
                                        <View className="h-9 w-9 rounded-xl bg-primary/15 items-center justify-center">
                                            <MaterialIcons name="timeline" size={18} color="#6366F1" />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-sm font-bold text-stone-700 dark:text-slate-200">Datos insuficientes</Text>
                                            <Text className="text-xs text-stone-400 dark:text-slate-500 mt-0.5">
                                                Necesitamos al menos 3 meses de datos para mostrarte tendencias
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </FadeIn>
                        )}

                        {/* Evolution Chart */}
                        <View className="px-5 pb-4">
                            <EvolutionChart
                                data={evolutionData}
                                currency={primaryCurrency}
                            />
                        </View>

                        {/* Distribution Pie */}
                        <View className="px-5 pb-4">
                            <DistributionPie
                                slices={distributionSlices}
                                currency={primaryCurrency}
                                title={`Distribucion — ${monthLabel(currentSummary?.month ?? months[months.length - 1])}`}
                            />
                        </View>

                        {/* Category Lines */}
                        {hasEnoughData && (
                            <View className="px-5 pb-4">
                                <CategoryLinesChart
                                    categoryTrends={categoryTrends}
                                    months={months}
                                    currency={primaryCurrency}
                                />
                            </View>
                        )}

                    </>
                )}
            </ScrollView>
        </FrostBackground>
    );
}
