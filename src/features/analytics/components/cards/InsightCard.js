import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getCategoryStyle } from '../../../../lib/helpers';
import { ScalePress } from '../../../../../components/ui';

const SEVERITY_CONFIG = {
    critical: {
        bg: 'bg-red-50 dark:bg-red-500/8',
        border: 'border-red-100 dark:border-red-900/20',
        iconBg: 'bg-red-500/15',
        icon: 'error',
        iconColor: '#ef4444',
        textColor: 'text-red-500',
    },
    warning: {
        bg: 'bg-amber-50 dark:bg-amber-500/8',
        border: 'border-amber-100 dark:border-amber-900/20',
        iconBg: 'bg-amber-500/15',
        icon: 'warning',
        iconColor: '#f59e0b',
        textColor: 'text-amber-600',
    },
    info: {
        bg: 'bg-emerald-50 dark:bg-emerald-500/8',
        border: 'border-emerald-100 dark:border-emerald-900/20',
        iconBg: 'bg-emerald-500/15',
        icon: 'info',
        iconColor: '#10b981',
        textColor: 'text-emerald-600',
    },
};

export default function InsightCard({ insight, onDismiss, onPress }) {
    const config = SEVERITY_CONFIG[insight.severity] ?? SEVERITY_CONFIG.info;
    const catStyle = insight.categoryColor ? getCategoryStyle(insight.categoryColor) : null;

    return (
        <ScalePress onPress={onPress} activeScale={0.98}>
            <View className={`rounded-2xl p-3.5 border ${config.bg} ${config.border}`}>
                <View className="flex-row items-start gap-3">
                    <View className={`h-9 w-9 rounded-xl ${config.iconBg} items-center justify-center mt-0.5`}>
                        {insight.categoryIcon ? (
                            <MaterialIcons
                                name={insight.categoryIcon}
                                size={18}
                                color={catStyle?.hex ?? config.iconColor}
                            />
                        ) : (
                            <MaterialIcons name={config.icon} size={18} color={config.iconColor} />
                        )}
                    </View>
                    <View className="flex-1">
                        <Text className="text-sm font-bold text-stone-800 dark:text-white leading-5">
                            {insight.message}
                        </Text>
                        {insight.detail && (
                            <Text className={`text-xs mt-1 font-semibold ${config.textColor}`}>
                                {insight.detail}
                            </Text>
                        )}
                    </View>
                    {onDismiss && (
                        <TouchableOpacity onPress={() => onDismiss(insight.id)} hitSlop={8}>
                            <MaterialIcons name="close" size={16} color="#a8a29e" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </ScalePress>
    );
}
