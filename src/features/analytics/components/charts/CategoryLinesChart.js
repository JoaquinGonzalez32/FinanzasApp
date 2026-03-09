import { View, Text, TouchableOpacity, useColorScheme, ScrollView } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useMemo, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { getCategoryStyle, formatCurrency } from '../../../../lib/helpers';
import { shortMonthLabel } from '../../utils/math';
import { FadeIn } from '../../../../../components/ui';

const MAX_LINES = 5;

export default function CategoryLinesChart({ categoryTrends, months, currency }) {
    const isDark = useColorScheme() === 'dark';
    const [activeIds, setActiveIds] = useState(() =>
        new Set(categoryTrends.slice(0, 3).map((t) => t.categoryId)),
    );
    const [showPercent, setShowPercent] = useState(false);

    const toggleCategory = (id) => {
        setActiveIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else if (next.size < MAX_LINES) {
                next.add(id);
            }
            return next;
        });
    };

    const activeTrends = useMemo(
        () => categoryTrends.filter((t) => activeIds.has(t.categoryId)),
        [categoryTrends, activeIds],
    );

    const lineDataSets = useMemo(() => {
        return activeTrends.map((trend) => {
            const style = getCategoryStyle(trend.categoryColor);
            const totals = showPercent
                ? months.map((m) => {
                    const monthTotal = activeTrends.reduce((s, t) => {
                        const pt = t.monthlyAmounts.find((a) => a.month === m);
                        return s + (pt?.amount ?? 0);
                    }, 0);
                    return monthTotal;
                })
                : null;

            return {
                id: trend.categoryId,
                name: trend.categoryName,
                color: style.hex,
                data: trend.monthlyAmounts.map((ma, i) => ({
                    value: showPercent
                        ? (totals && totals[i] > 0 ? (ma.amount / totals[i]) * 100 : 0)
                        : ma.amount,
                    label: i === 0 || i === trend.monthlyAmounts.length - 1
                        ? shortMonthLabel(ma.month)
                        : '',
                })),
            };
        });
    }, [activeTrends, months, showPercent]);

    const maxVal = useMemo(() => {
        let max = 0;
        for (const ds of lineDataSets) {
            for (const d of ds.data) {
                max = Math.max(max, d.value);
            }
        }
        return max * 1.15 || 1000;
    }, [lineDataSets]);

    if (categoryTrends.length === 0) {
        return (
            <View className="bg-white/75 dark:bg-surface-dark rounded-2xl p-4 border border-white/60 dark:border-slate-800 shadow-sm">
                <Text className="text-sm font-bold text-stone-800 dark:text-white mb-3">Evolucion por Categoria</Text>
                <View className="h-32 items-center justify-center">
                    <Text className="text-sm text-stone-400">Sin datos suficientes</Text>
                </View>
            </View>
        );
    }

    return (
        <FadeIn delay={250}>
            <View className="bg-white/75 dark:bg-surface-dark rounded-2xl p-4 border border-white/60 dark:border-slate-800 shadow-sm">
                <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-sm font-bold text-stone-800 dark:text-white">Evolucion por Categoria</Text>
                    <TouchableOpacity
                        onPress={() => setShowPercent(!showPercent)}
                        className="px-2.5 py-1 rounded-full bg-frost dark:bg-input-dark"
                    >
                        <Text className="text-xs font-semibold text-stone-500 dark:text-slate-400">
                            {showPercent ? '%' : '$'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Category toggles */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                    <View className="flex-row gap-2">
                        {categoryTrends.slice(0, 8).map((trend) => {
                            const style = getCategoryStyle(trend.categoryColor);
                            const isActive = activeIds.has(trend.categoryId);
                            return (
                                <TouchableOpacity
                                    key={trend.categoryId}
                                    onPress={() => toggleCategory(trend.categoryId)}
                                    className={`flex-row items-center gap-1.5 px-2.5 py-1.5 rounded-full border ${
                                        isActive
                                            ? 'border-primary/20 bg-primary/5'
                                            : 'border-stone-200 dark:border-slate-700 bg-transparent'
                                    }`}
                                >
                                    <View
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: isActive ? style.hex : '#cbd5e1' }}
                                    />
                                    <Text className={`text-xs font-medium ${isActive ? 'text-stone-700 dark:text-slate-200' : 'text-stone-400 dark:text-slate-500'}`}>
                                        {trend.categoryName}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>

                {lineDataSets.length === 0 ? (
                    <View className="h-32 items-center justify-center">
                        <Text className="text-sm text-stone-400">Selecciona categorias</Text>
                    </View>
                ) : (
                    <LineChart
                        data={lineDataSets[0]?.data ?? []}
                        data2={lineDataSets[1]?.data}
                        data3={lineDataSets[2]?.data}
                        data4={lineDataSets[3]?.data}
                        data5={lineDataSets[4]?.data}
                        color1={lineDataSets[0]?.color ?? '#6366F1'}
                        color2={lineDataSets[1]?.color}
                        color3={lineDataSets[2]?.color}
                        color4={lineDataSets[3]?.color}
                        color5={lineDataSets[4]?.color}
                        dataPointsColor1={lineDataSets[0]?.color ?? '#6366F1'}
                        dataPointsColor2={lineDataSets[1]?.color}
                        dataPointsColor3={lineDataSets[2]?.color}
                        dataPointsColor4={lineDataSets[3]?.color}
                        dataPointsColor5={lineDataSets[4]?.color}
                        thickness={2}
                        noOfSections={4}
                        maxValue={maxVal}
                        height={140}
                        xAxisThickness={0}
                        yAxisThickness={0}
                        yAxisTextStyle={{ color: isDark ? '#475569' : '#a8a29e', fontSize: 9 }}
                        xAxisLabelTextStyle={{ color: isDark ? '#475569' : '#a8a29e', fontSize: 9 }}
                        hideRules
                        isAnimated
                        animationDuration={600}
                        curved
                        backgroundColor="transparent"
                        formatYLabel={(val) => {
                            const n = Number(val);
                            if (showPercent) return `${Math.round(n)}%`;
                            if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
                            return String(Math.round(n));
                        }}
                    />
                )}
            </View>
        </FadeIn>
    );
}
