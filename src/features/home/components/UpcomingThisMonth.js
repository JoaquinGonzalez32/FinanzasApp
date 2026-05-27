import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FadeIn } from '../../../../components/ui';
import { getCategoryStyle, formatCurrency } from '../../../lib/helpers';

/**
 * "Próximos del mes" — surfaces the next recurring expense to apply +
 * any budget categories already at high utilization (≥85%).
 * Capped at 5 items, sorted by urgency.
 *
 * Props are computed in the parent screen so this component stays
 * presentational and trivially testable.
 */
export default function UpcomingThisMonth({ pendingRecurring = [], criticalBudgets = [] }) {
    const router = useRouter();
    const todayDay = new Date().getDate();

    const items = useMemo(() => {
        // Recurring → upcoming
        const recurringItems = pendingRecurring.map((p) => {
            const dom = p.recurring.day_of_month;
            const daysUntil = Math.max(0, dom - todayDay);
            return {
                kind: 'recurring',
                key: `r-${p.recurring.id}`,
                title: p.recurring.category?.name ?? 'Recurrente',
                subtitle: daysUntil === 0 ? 'Hoy' : daysUntil === 1 ? 'Mañana' : `En ${daysUntil} días`,
                amount: p.recurring.amount,
                icon: p.recurring.category?.icon ?? 'repeat',
                color: p.recurring.category?.color,
                sortKey: daysUntil,
                urgent: daysUntil <= 2,
            };
        });

        // Budget at risk → critical. Accepts the flat shape produced by
        // the existing categoryAlerts memo (name/icon/color, pct, remaining,
        // currency) — no nested category object required.
        const budgetItems = criticalBudgets
            .filter((b) => b.pct >= 85)
            .map((b, i) => ({
                kind: 'budget',
                key: `b-${b.name}-${i}`,
                title: b.name,
                subtitle: `${Math.round(b.pct)}% usado`,
                amount: b.remaining,
                icon: b.icon ?? 'warning',
                color: b.color,
                currency: b.currency,
                sortKey: -b.pct, // higher pct first
                urgent: b.pct >= 100,
            }));

        return [...recurringItems, ...budgetItems]
            .sort((a, b) => a.sortKey - b.sortKey)
            .slice(0, 5);
    }, [pendingRecurring, criticalBudgets, todayDay]);

    if (items.length === 0) return null;

    return (
        <FadeIn delay={250}>
            <View className="px-5 pt-2 pb-3">
                <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Próximos del mes
                    </Text>
                    <TouchableOpacity
                        onPress={() => router.push('/(tabs)/budget')}
                        accessibilityRole="button"
                        accessibilityLabel="Ver presupuesto"
                    >
                        <Text className="text-xs font-bold text-primary">Ver todo</Text>
                    </TouchableOpacity>
                </View>

                <View className="bg-white dark:bg-card-dark rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                    {items.map((item, i) => {
                        const style = getCategoryStyle(item.color);
                        return (
                            <View
                                key={item.key}
                                className={`flex-row items-center gap-3 px-4 py-3 ${i < items.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}
                            >
                                <View className={`h-9 w-9 rounded-xl items-center justify-center ${style.bg}`}>
                                    <MaterialIcons name={item.icon} size={18} color={style.hex} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm font-bold text-slate-900 dark:text-white" numberOfLines={1}>
                                        {item.title}
                                    </Text>
                                    <Text className={`text-xs mt-0.5 ${item.urgent ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                                        {item.subtitle}
                                    </Text>
                                </View>
                                <Text className={`text-sm font-extrabold ${item.kind === 'budget' && item.urgent ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                                    {item.kind === 'budget'
                                        ? formatCurrency(Math.max(0, item.amount), item.currency)
                                        : formatCurrency(item.amount, 'UYU')}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>
        </FadeIn>
    );
}
