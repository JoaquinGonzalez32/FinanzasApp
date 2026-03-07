import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { formatCurrency } from '../../../../lib/helpers';
import { ScalePress, AnimatedProgressBar } from '../../../../../components/ui';

export default function AnalyticsSummaryWidget({
    currentSummary,
    previousSummary,
    topInsight,
    currency,
    onPress,
    onInsightDismiss,
}) {
    if (!currentSummary) return null;

    const expenseChange = previousSummary
        ? ((currentSummary.totalExpense - previousSummary.totalExpense) / (previousSummary.totalExpense || 1)) * 100
        : null;
    const isUp = expenseChange !== null && expenseChange > 0;

    const SEVERITY_ICON = {
        critical: { name: 'error', color: '#ef4444', bg: 'bg-red-500/10' },
        warning: { name: 'warning', color: '#f59e0b', bg: 'bg-amber-500/10' },
        info: { name: 'info', color: '#10b981', bg: 'bg-emerald-500/10' },
    };

    return (
        <ScalePress onPress={onPress} activeScale={0.98}>
            <View className="bg-white/75 dark:bg-surface-dark rounded-2xl p-4 border border-white/60 dark:border-slate-800 shadow-sm">
                <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center gap-2">
                        <View className="h-8 w-8 rounded-xl bg-purple-500/10 items-center justify-center">
                            <MaterialIcons name="insights" size={16} color="#9333ea" />
                        </View>
                        <Text className="text-sm font-bold text-stone-800 dark:text-white">Analisis</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={18} color="#d6d3d1" />
                </View>

                {/* Mini KPIs */}
                <View className="flex-row gap-3 mb-3">
                    <View className="flex-1 bg-frost dark:bg-input-dark rounded-xl p-2.5">
                        <Text className="text-xs text-stone-400 dark:text-slate-500">Gasto</Text>
                        <Text className="text-sm font-bold text-stone-800 dark:text-white mt-0.5">
                            {formatCurrency(currentSummary.totalExpense, currency)}
                        </Text>
                        {expenseChange !== null && (
                            <View className="flex-row items-center gap-0.5 mt-0.5">
                                <MaterialIcons
                                    name={isUp ? 'trending-up' : 'trending-down'}
                                    size={10}
                                    color={isUp ? '#ef4444' : '#10b981'}
                                />
                                <Text className={`text-xs font-semibold ${isUp ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {Math.abs(Math.round(expenseChange))}%
                                </Text>
                            </View>
                        )}
                    </View>
                    <View className="flex-1 bg-frost dark:bg-input-dark rounded-xl p-2.5">
                        <Text className="text-xs text-stone-400 dark:text-slate-500">Ahorro</Text>
                        <Text className="text-sm font-bold text-stone-800 dark:text-white mt-0.5">
                            {Math.round(currentSummary.savingsRate)}%
                        </Text>
                        <View className="mt-1.5">
                            <AnimatedProgressBar
                                percentage={Math.min(currentSummary.savingsRate, 100)}
                                color={currentSummary.savingsRate >= 20 ? '#10b981' : '#f59e0b'}
                                height={3}
                                delay={200}
                            />
                        </View>
                    </View>
                </View>

                {/* Top Insight */}
                {topInsight && (
                    <View className={`flex-row items-center gap-2.5 px-3 py-2.5 rounded-xl ${SEVERITY_ICON[topInsight.severity]?.bg ?? 'bg-primary/5'}`}>
                        <MaterialIcons
                            name={SEVERITY_ICON[topInsight.severity]?.name ?? 'info'}
                            size={14}
                            color={SEVERITY_ICON[topInsight.severity]?.color ?? '#6366F1'}
                        />
                        <Text className="flex-1 text-xs font-medium text-stone-600 dark:text-slate-300" numberOfLines={2}>
                            {topInsight.message}
                        </Text>
                        {onInsightDismiss && (
                            <TouchableOpacity onPress={() => onInsightDismiss(topInsight.id)} hitSlop={8}>
                                <MaterialIcons name="close" size={14} color="#a8a29e" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>
        </ScalePress>
    );
}
