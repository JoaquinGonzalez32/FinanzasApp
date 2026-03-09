import { View, Text, useColorScheme, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { useMemo, useState } from 'react';
import { formatCurrency } from '../../../../lib/helpers';
import { FadeIn } from '../../../../../components/ui';

const screenWidth = Dimensions.get('window').width;

export default function EvolutionChart({ data, currency, onBarPress }) {
    const isDark = useColorScheme() === 'dark';
    const [selected, setSelected] = useState(null);

    const chartData = useMemo(() => {
        const items = [];
        for (const point of data) {
            items.push({
                value: point.expense,
                label: point.label,
                frontColor: '#ef4444',
                spacing: 2,
                labelTextStyle: {
                    color: isDark ? '#94a3b8' : '#a8a29e',
                    fontSize: 10,
                    fontWeight: '500',
                },
                month: point.month,
                type: 'expense',
            });
            items.push({
                value: point.income,
                frontColor: '#10b981',
                spacing: data.length > 6 ? 12 : 20,
                month: point.month,
                type: 'income',
            });
        }
        return items;
    }, [data, isDark]);

    const lineData = useMemo(() => {
        return data.map((point) => ({
            value: point.net,
            dataPointText: '',
        }));
    }, [data]);

    const maxVal = useMemo(() => {
        let max = 0;
        for (const d of data) {
            max = Math.max(max, d.income, d.expense, Math.abs(d.net));
        }
        return max * 1.15 || 1000;
    }, [data]);

    const barWidth = data.length > 6 ? 12 : 18;
    const chartWidth = Math.max(screenWidth - 80, data.length * (barWidth * 2 + (data.length > 6 ? 22 : 30)));

    const handlePress = (item) => {
        const month = item.month;
        setSelected(month);
        if (onBarPress) onBarPress(month);
    };

    return (
        <FadeIn delay={100}>
            <View className="bg-white/75 dark:bg-surface-dark rounded-2xl p-4 border border-white/60 dark:border-slate-800 shadow-sm">
                <Text className="text-sm font-bold text-stone-800 dark:text-white mb-1">
                    Ingresos vs Gastos
                </Text>
                <View className="flex-row items-center gap-4 mb-3">
                    <View className="flex-row items-center gap-1.5">
                        <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#10b981' }} />
                        <Text className="text-xs text-stone-400 dark:text-slate-500">Ingresos</Text>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                        <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ef4444' }} />
                        <Text className="text-xs text-stone-400 dark:text-slate-500">Gastos</Text>
                    </View>
                </View>

                {data.length === 0 ? (
                    <View className="h-40 items-center justify-center">
                        <Text className="text-sm text-stone-400">Sin datos</Text>
                    </View>
                ) : (
                    <BarChart
                        data={chartData}
                        barWidth={barWidth}
                        spacing={data.length > 6 ? 6 : 10}
                        roundedTop
                        roundedBottom
                        xAxisThickness={0}
                        yAxisThickness={0}
                        yAxisTextStyle={{ color: isDark ? '#475569' : '#a8a29e', fontSize: 9 }}
                        noOfSections={4}
                        maxValue={maxVal}
                        height={160}
                        width={chartWidth}
                        scrollAnimation
                        isAnimated
                        animationDuration={600}
                        onPress={handlePress}
                        hideRules
                        backgroundColor="transparent"
                        rulesColor={isDark ? '#1e293b' : '#f1f5f9'}
                        formatYLabel={(val) => {
                            const n = Number(val);
                            if (n >= 1000) return `${(n / 1000).toFixed(0)}k`;
                            return String(Math.round(n));
                        }}
                    />
                )}

                {selected && (
                    <View className="mt-2 bg-frost dark:bg-input-dark rounded-xl p-3">
                        {(() => {
                            const point = data.find((d) => d.month === selected);
                            if (!point) return null;
                            return (
                                <View className="flex-row justify-between">
                                    <View>
                                        <Text className="text-xs text-stone-400">Ingresos</Text>
                                        <Text className="text-sm font-bold text-emerald-500">
                                            +{formatCurrency(point.income, currency)}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text className="text-xs text-stone-400">Gastos</Text>
                                        <Text className="text-sm font-bold text-red-500">
                                            -{formatCurrency(point.expense, currency)}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text className="text-xs text-stone-400">Balance</Text>
                                        <Text className={`text-sm font-bold ${point.net >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {point.net >= 0 ? '+' : '-'}{formatCurrency(Math.abs(point.net), currency)}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })()}
                    </View>
                )}
            </View>
        </FadeIn>
    );
}
