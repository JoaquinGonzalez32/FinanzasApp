import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { FadeIn } from '../../../../components/ui';

/**
 * "Insight del día" — surfaces a single contextual takeaway.
 *
 * Currently a heuristic placeholder: the parent computes the insight
 * and passes it in. Once AI categorization lands (Fase 3 follow-up),
 * an LLM-generated `aiInsight` can replace `heuristicInsight` with
 * zero changes to this component.
 */
export default function DailyInsight({ insight }) {
    if (!insight) return null;

    const tone = insight.tone ?? 'info'; // info | warning | danger | good
    const config = TONE_CONFIG[tone] ?? TONE_CONFIG.info;

    return (
        <FadeIn delay={150}>
            <View className="px-5 pb-3">
                <View className={`rounded-2xl border ${config.border} ${config.bg} p-4 flex-row items-start gap-3`}>
                    <View className={`h-9 w-9 rounded-xl items-center justify-center ${config.iconBg}`}>
                        <MaterialIcons name={insight.icon ?? config.defaultIcon} size={18} color={config.iconColor} />
                    </View>
                    <View className="flex-1">
                        <Text className={`text-sm font-bold ${config.titleColor}`}>{insight.title}</Text>
                        {insight.body ? (
                            <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {insight.body}
                            </Text>
                        ) : null}
                    </View>
                </View>
            </View>
        </FadeIn>
    );
}

const TONE_CONFIG = {
    info: {
        bg: 'bg-white dark:bg-card-dark',
        border: 'border-slate-200 dark:border-slate-700',
        iconBg: 'bg-primary-faint dark:bg-primary/10',
        iconColor: '#6366F1',
        titleColor: 'text-slate-900 dark:text-white',
        defaultIcon: 'insights',
    },
    good: {
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
        border: 'border-emerald-200 dark:border-emerald-900/40',
        iconBg: 'bg-emerald-100 dark:bg-emerald-500/20',
        iconColor: '#059669',
        titleColor: 'text-emerald-700 dark:text-emerald-300',
        defaultIcon: 'thumb-up',
    },
    warning: {
        bg: 'bg-amber-50 dark:bg-amber-500/10',
        border: 'border-amber-200 dark:border-amber-900/40',
        iconBg: 'bg-amber-100 dark:bg-amber-500/20',
        iconColor: '#d97706',
        titleColor: 'text-amber-700 dark:text-amber-300',
        defaultIcon: 'warning',
    },
    danger: {
        bg: 'bg-red-50 dark:bg-red-500/10',
        border: 'border-red-200 dark:border-red-900/40',
        iconBg: 'bg-red-100 dark:bg-red-500/20',
        iconColor: '#dc2626',
        titleColor: 'text-red-700 dark:text-red-300',
        defaultIcon: 'error-outline',
    },
};
