import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const TRENDS = {
    up: { icon: 'trending-up', color: 'text-emerald-500', iconColor: '#10b981' },
    down: { icon: 'trending-down', color: 'text-red-500', iconColor: '#ef4444' },
    neutral: { icon: 'remove', color: 'text-stone-400', iconColor: '#a8a29e' },
};

const MetricCard = ({
    label,
    value,
    context,
    trend,
    icon,
    iconBg = 'bg-primary/10',
    iconColor = '#6366F1',
    variant = 'outlined',
    className: extraClass = '',
}) => {
    const trendData = trend ? TRENDS[trend] || TRENDS.neutral : null;

    const bgClass = variant === 'elevated'
        ? 'bg-primary'
        : variant === 'flat'
            ? 'bg-frost-light dark:bg-input-dark'
            : 'bg-white/75 dark:bg-surface-dark border border-white/60 dark:border-slate-800 shadow-sm';

    const labelColor = variant === 'elevated'
        ? 'text-white/70'
        : 'text-stone-500 dark:text-slate-400';

    const valueColor = variant === 'elevated'
        ? 'text-white'
        : 'text-stone-900 dark:text-white';

    return (
        <View className={`p-4 rounded-2xl ${bgClass} ${extraClass}`}>
            {icon && (
                <View className={`h-10 w-10 rounded-xl ${variant === 'elevated' ? 'bg-white/20' : iconBg} items-center justify-center mb-3`}>
                    <MaterialIcons
                        name={icon}
                        size={20}
                        color={variant === 'elevated' ? '#ffffff' : iconColor}
                    />
                </View>
            )}
            <Text className={`text-xs font-semibold uppercase tracking-wider ${labelColor}`}>
                {label}
            </Text>
            <Text className={`text-2xl font-extrabold ${valueColor} mt-1`}>
                {value}
            </Text>
            {(context || trendData) && (
                <View className="flex-row items-center gap-1 mt-1.5">
                    {trendData && (
                        <MaterialIcons
                            name={trendData.icon}
                            size={14}
                            color={variant === 'elevated' ? '#ffffff99' : trendData.iconColor}
                        />
                    )}
                    <Text className={`text-xs font-medium ${variant === 'elevated' ? 'text-white/60' : trendData ? trendData.color : 'text-stone-400 dark:text-slate-500'}`}>
                        {context}
                    </Text>
                </View>
            )}
        </View>
    );
};

export default MetricCard;
