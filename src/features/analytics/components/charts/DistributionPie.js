import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { useMemo, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { formatCurrency } from '../../../../lib/helpers';
import { FadeIn } from '../../../../../components/ui';

export default function DistributionPie({ slices, currency, title = 'Distribucion del Gasto' }) {
    const isDark = useColorScheme() === 'dark';
    const [focused, setFocused] = useState(null);

    const pieData = useMemo(() => {
        if (!slices || slices.length === 0) return [];
        return slices.map((s, i) => ({
            value: s.amount,
            color: s.color,
            text: `${Math.round(s.percentage)}%`,
            focused: focused === i,
            onPress: () => setFocused(focused === i ? null : i),
        }));
    }, [slices, focused]);

    const total = useMemo(
        () => (slices ?? []).reduce((s, d) => s + d.amount, 0),
        [slices],
    );

    if (!slices || slices.length === 0) {
        return (
            <View className="bg-white/75 dark:bg-surface-dark rounded-2xl p-4 border border-white/60 dark:border-slate-800 shadow-sm">
                <Text className="text-sm font-bold text-stone-800 dark:text-white mb-3">{title}</Text>
                <View className="h-40 items-center justify-center">
                    <Text className="text-sm text-stone-400">Sin datos</Text>
                </View>
            </View>
        );
    }

    const focusedSlice = focused !== null ? slices[focused] : null;

    return (
        <FadeIn delay={200}>
            <View className="bg-white/75 dark:bg-surface-dark rounded-2xl p-4 border border-white/60 dark:border-slate-800 shadow-sm">
                <Text className="text-sm font-bold text-stone-800 dark:text-white mb-3">{title}</Text>

                <View className="items-center">
                    <PieChart
                        data={pieData}
                        donut
                        radius={80}
                        innerRadius={50}
                        innerCircleColor={isDark ? '#1a242f' : '#ffffff'}
                        centerLabelComponent={() => (
                            <View className="items-center">
                                {focusedSlice ? (
                                    <>
                                        <Text className="text-xs text-stone-400 dark:text-slate-500">
                                            {focusedSlice.label}
                                        </Text>
                                        <Text className="text-base font-extrabold text-stone-800 dark:text-white">
                                            {Math.round(focusedSlice.percentage)}%
                                        </Text>
                                    </>
                                ) : (
                                    <>
                                        <Text className="text-xs text-stone-400 dark:text-slate-500">Total</Text>
                                        <Text className="text-sm font-bold text-stone-800 dark:text-white">
                                            {formatCurrency(total, currency)}
                                        </Text>
                                    </>
                                )}
                            </View>
                        )}
                        isAnimated
                        animationDuration={500}
                        focusOnPress
                        sectionAutoFocus
                    />
                </View>

                {/* Legend */}
                <View className="mt-4 gap-2">
                    {slices.slice(0, 6).map((s, i) => (
                        <TouchableOpacity
                            key={i}
                            onPress={() => setFocused(focused === i ? null : i)}
                            activeOpacity={0.7}
                            className={`flex-row items-center gap-2.5 px-2 py-1.5 rounded-xl ${focused === i ? 'bg-frost dark:bg-input-dark' : ''}`}
                        >
                            <View className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                            {s.icon && (
                                <MaterialIcons name={s.icon} size={14} color={s.color} />
                            )}
                            <Text className="flex-1 text-sm text-stone-700 dark:text-slate-300 font-medium">
                                {s.label}
                            </Text>
                            <Text className="text-xs text-stone-500 dark:text-slate-400 font-semibold">
                                {formatCurrency(s.amount, currency)}
                            </Text>
                            <Text className="text-xs text-stone-400 dark:text-slate-500 w-10 text-right">
                                {Math.round(s.percentage)}%
                            </Text>
                        </TouchableOpacity>
                    ))}
                    {slices.length > 6 && (
                        <Text className="text-xs text-stone-400 dark:text-slate-500 text-center mt-1">
                            +{slices.length - 6} categorias mas
                        </Text>
                    )}
                </View>
            </View>
        </FadeIn>
    );
}
