import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const STATUS_CONFIG = {
    optimal: {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-600 dark:text-emerald-400',
        icon: 'check-circle',
        iconColor: '#10b981',
        defaultLabel: 'En ritmo',
    },
    normal: {
        bg: 'bg-primary/10',
        text: 'text-primary',
        icon: 'info',
        iconColor: '#137fec',
        defaultLabel: 'Normal',
    },
    warning: {
        bg: 'bg-amber-500/10',
        text: 'text-amber-600 dark:text-amber-400',
        icon: 'warning',
        iconColor: '#f59e0b',
        defaultLabel: 'En riesgo',
    },
    critical: {
        bg: 'bg-red-500/10',
        text: 'text-red-600 dark:text-red-400',
        icon: 'error',
        iconColor: '#ef4444',
        defaultLabel: 'Excedido',
    },
};

const StatusBadge = ({
    status = 'normal',
    label,
    showIcon = true,
    size = 'md',
    className: extraClass = '',
}) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.normal;
    const displayLabel = label || config.defaultLabel;

    const sizeClasses = size === 'sm'
        ? 'px-2 py-0.5'
        : 'px-3 py-1';
    const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';
    const iconSize = size === 'sm' ? 12 : 14;

    return (
        <View className={`flex-row items-center gap-1 rounded-full ${config.bg} ${sizeClasses} ${extraClass}`}>
            {showIcon && (
                <MaterialIcons name={config.icon} size={iconSize} color={config.iconColor} />
            )}
            <Text className={`${textSize} font-semibold ${config.text}`}>
                {displayLabel}
            </Text>
        </View>
    );
};

StatusBadge.getStatus = (percentage) => {
    if (percentage <= 65) return 'optimal';
    if (percentage <= 85) return 'normal';
    if (percentage <= 100) return 'warning';
    return 'critical';
};

export default StatusBadge;
