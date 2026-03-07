import { View, Text, ScrollView, TouchableOpacity, RefreshControl, useColorScheme } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useCallback, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FrostBackground, FadeIn, SkeletonLoader } from '../components/ui';
import { useComparison } from '../src/features/analytics/hooks/useComparison';
import ComparisonCard from '../src/features/analytics/components/cards/ComparisonCard';
import { useAccounts } from '../src/hooks/useAccounts';
import { monthLabel, shiftMonth, MONTHS_ES } from '../src/lib/helpers';

export default function ComparisonScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const isDark = useColorScheme() === 'dark';
    const params = useLocalSearchParams();
    const { accounts } = useAccounts();
    const primaryCurrency = accounts[0]?.currency;

    const { comparison, loading, error, monthA, monthB, setMonthA, setMonthB, refresh } = useComparison(
        params.monthA ?? shiftMonth(getCurrentMonth(), -1),
        params.monthB ?? getCurrentMonth(),
        primaryCurrency,
    );

    const [refreshing, setRefreshing] = useState(false);
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try { await refresh(); } finally { setRefreshing(false); }
    }, [refresh]);

    const navigateMonth = (which, delta) => {
        if (which === 'A') setMonthA(shiftMonth(monthA, delta));
        else setMonthB(shiftMonth(monthB, delta));
    };

    return (
        <FrostBackground edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
                <TouchableOpacity onPress={() => router.back()} hitSlop={8} className="h-10 w-10 items-center justify-center">
                    <MaterialIcons name="arrow-back" size={22} color={isDark ? '#fff' : '#292524'} />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-stone-900 dark:text-white">Comparar</Text>
                <View className="w-10" />
            </View>

            {/* Period selectors */}
            <View className="flex-row items-center gap-3 px-5 pb-4">
                <MonthSelector
                    month={monthA}
                    onPrev={() => navigateMonth('A', -1)}
                    onNext={() => navigateMonth('A', 1)}
                    isDark={isDark}
                />
                <View className="h-8 w-8 rounded-full bg-frost dark:bg-input-dark items-center justify-center">
                    <MaterialIcons name="compare-arrows" size={16} color="#a8a29e" />
                </View>
                <MonthSelector
                    month={monthB}
                    onPrev={() => navigateMonth('B', -1)}
                    onNext={() => navigateMonth('B', 1)}
                    isDark={isDark}
                />
            </View>

            {/* Quick presets */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5 pb-4">
                <View className="flex-row gap-2">
                    <PresetChip
                        label="Mes anterior"
                        onPress={() => {
                            const cur = getCurrentMonth();
                            setMonthA(shiftMonth(cur, -1));
                            setMonthB(cur);
                        }}
                    />
                    <PresetChip
                        label="Mismo mes, ano anterior"
                        onPress={() => {
                            const cur = getCurrentMonth();
                            setMonthA(shiftMonth(cur, -12));
                            setMonthB(cur);
                        }}
                    />
                    <PresetChip
                        label="Hace 2 meses"
                        onPress={() => {
                            const cur = getCurrentMonth();
                            setMonthA(shiftMonth(cur, -2));
                            setMonthB(cur);
                        }}
                    />
                </View>
            </ScrollView>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" colors={['#6366F1']} />
                }
            >
                {loading && !refreshing ? (
                    <View className="px-5 gap-4">
                        <SkeletonLoader.Card lines={6} />
                    </View>
                ) : error ? (
                    <View className="px-5">
                        <View className="bg-red-50 dark:bg-red-500/8 rounded-2xl p-4 flex-row items-center gap-3 border border-red-100 dark:border-red-900/20">
                            <MaterialIcons name="error-outline" size={18} color="#ef4444" />
                            <Text className="text-red-500 text-xs flex-1 font-medium">{error}</Text>
                        </View>
                    </View>
                ) : (
                    <FadeIn delay={100}>
                        <View className="px-5">
                            <ComparisonCard comparison={comparison} currency={primaryCurrency} />
                        </View>
                    </FadeIn>
                )}
            </ScrollView>
        </FrostBackground>
    );
}

function MonthSelector({ month, onPrev, onNext, isDark }) {
    return (
        <View className="flex-1 flex-row items-center justify-between bg-white/75 dark:bg-surface-dark rounded-xl px-2 py-2 border border-white/60 dark:border-slate-800">
            <TouchableOpacity onPress={onPrev} hitSlop={8} className="p-1">
                <MaterialIcons name="chevron-left" size={18} color={isDark ? '#94a3b8' : '#78716c'} />
            </TouchableOpacity>
            <Text className="text-xs font-bold text-stone-700 dark:text-slate-300">{monthLabel(month)}</Text>
            <TouchableOpacity onPress={onNext} hitSlop={8} className="p-1">
                <MaterialIcons name="chevron-right" size={18} color={isDark ? '#94a3b8' : '#78716c'} />
            </TouchableOpacity>
        </View>
    );
}

function PresetChip({ label, onPress }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            className="px-3 py-1.5 rounded-full bg-frost dark:bg-input-dark border border-stone-200 dark:border-slate-700"
        >
            <Text className="text-xs font-medium text-stone-500 dark:text-slate-400">{label}</Text>
        </TouchableOpacity>
    );
}

function getCurrentMonth() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
