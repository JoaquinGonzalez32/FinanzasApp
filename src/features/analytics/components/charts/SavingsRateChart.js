import { View, Text, useColorScheme } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useMemo } from 'react';
import { FadeIn } from '../../../../../components/ui';

export default function SavingsRateChart({ summaries, targetRate }) {
    const isDark = useColorScheme() === 'dark';

    const chartData = useMemo(() => {
        return summaries.map((s) => ({
            value: Math.round(s.savingsRate * 100) / 100,
            label: s.month.split('-')[1],
            dataPointText: '',
        }));
    }, [summaries]);

    const targetData = useMemo(() => {
        if (!targetRate) return null;
        return summaries.map(() => ({
            value: targetRate,
        }));
    }, [summaries, targetRate]);

    const currentRate = summaries.length > 0 ? summaries[summaries.length - 1].savingsRate : 0;
    const belowTarget = targetRate ? currentRate < targetRate : false;

    const maxVal = useMemo(() => {
        let max = Math.max(...summaries.map((s) => s.savingsRate), targetRate ?? 0);
        return Math.ceil(max / 10) * 10 + 10 || 100;
    }, [summaries, targetRate]);

    if (summaries.length < 2) {
        return (
            <View className="bg-white/75 dark:bg-surface-dark rounded-2xl p-4 border border-white/60 dark:border-slate-800 shadow-sm">
                <Text className="text-sm font-bold text-stone-800 dark:text-white mb-3">Tasa de Ahorro</Text>
                <View className="h-32 items-center justify-center">
                    <Text className="text-sm text-stone-400">Necesitas al menos 2 meses de datos</Text>
                </View>
            </View>
        );
    }

    return (
        <FadeIn delay={300}>
            <View className="bg-white/75 dark:bg-surface-dark rounded-2xl p-4 border border-white/60 dark:border-slate-800 shadow-sm">
                <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-sm font-bold text-stone-800 dark:text-white">Tasa de Ahorro</Text>
                    <View className={`px-2.5 py-1 rounded-full ${belowTarget ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
                        <Text className={`text-xs font-bold ${belowTarget ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {Math.round(currentRate)}%
                        </Text>
                    </View>
                </View>

                {targetRate && (
                    <View className="flex-row items-center gap-1.5 mb-2">
                        <View className="w-4 h-0.5 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
                        <Text className="text-xs text-stone-400 dark:text-slate-500">Meta: {targetRate}%</Text>
                    </View>
                )}

                <LineChart
                    data={chartData}
                    data2={targetData}
                    color1={belowTarget ? '#f59e0b' : '#10b981'}
                    color2="#f59e0b"
                    dataPointsColor1={belowTarget ? '#f59e0b' : '#10b981'}
                    dataPointsColor2="#f59e0b"
                    dashGap={4}
                    dashWidth={4}
                    thickness={2.5}
                    thickness2={1.5}
                    areaChart
                    startFillColor={belowTarget ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)'}
                    endFillColor="transparent"
                    startOpacity={0.3}
                    endOpacity={0}
                    noOfSections={4}
                    maxValue={maxVal}
                    height={120}
                    xAxisThickness={0}
                    yAxisThickness={0}
                    yAxisTextStyle={{ color: isDark ? '#475569' : '#a8a29e', fontSize: 9 }}
                    xAxisLabelTextStyle={{ color: isDark ? '#475569' : '#a8a29e', fontSize: 9 }}
                    hideRules
                    isAnimated
                    animationDuration={600}
                    curved
                    backgroundColor="transparent"
                    formatYLabel={(val) => `${Math.round(Number(val))}%`}
                />
            </View>
        </FadeIn>
    );
}
