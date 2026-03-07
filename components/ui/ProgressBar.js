import { View, Text } from 'react-native';

const getSemanticColor = (percentage) => {
    if (percentage <= 65) return { bg: 'bg-emerald-500', label: 'optimal' };
    if (percentage <= 85) return { bg: 'bg-primary', label: 'normal' };
    if (percentage <= 100) return { bg: 'bg-amber-500', label: 'warning' };
    return { bg: 'bg-red-500', label: 'critical' };
};

const ProgressBar = ({
    current,
    total,
    height = 'h-2',
    showLabel = false,
    showPercentage = false,
    color,
    trackColor = 'bg-stone-200 dark:bg-slate-700',
    className: extraClass = '',
}) => {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    const clampedWidth = Math.min(percentage, 100);
    const semantic = getSemanticColor(percentage);
    const barColor = color || semantic.bg;

    return (
        <View className={extraClass}>
            {(showLabel || showPercentage) && (
                <View className="flex-row justify-between items-center mb-1.5">
                    {showLabel && (
                        <Text className="text-xs font-medium text-stone-500 dark:text-slate-400">
                            {percentage <= 100 ? 'restante' : 'excedido'}
                        </Text>
                    )}
                    {showPercentage && (
                        <Text className={`text-xs font-semibold ${percentage > 100 ? 'text-red-500' : 'text-stone-600 dark:text-slate-300'}`}>
                            {Math.round(percentage)}%
                        </Text>
                    )}
                </View>
            )}
            <View className={`w-full ${height} rounded-full overflow-hidden ${trackColor}`}>
                <View
                    className={`h-full rounded-full ${barColor}`}
                    style={{ width: `${clampedWidth}%` }}
                />
            </View>
        </View>
    );
};

ProgressBar.getSemanticColor = getSemanticColor;

export default ProgressBar;
