import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ScalePress } from '../../../../components/ui';

const SEVERITY_STYLES = {
    critical: {
        bg: 'bg-red-50 dark:bg-red-500/8',
        border: 'border-red-200 dark:border-red-900/20',
        iconBg: 'bg-red-500/15',
        iconColor: '#ef4444',
        textColor: 'text-red-600 dark:text-red-400',
    },
    warning: {
        bg: 'bg-amber-50 dark:bg-amber-500/8',
        border: 'border-amber-200 dark:border-amber-900/20',
        iconBg: 'bg-amber-500/15',
        iconColor: '#f59e0b',
        textColor: 'text-amber-700 dark:text-amber-400',
    },
    info: {
        bg: 'bg-primary-faint dark:bg-primary/8',
        border: 'border-indigo-100 dark:border-indigo-900/20',
        iconBg: 'bg-primary/15',
        iconColor: '#6366F1',
        textColor: 'text-primary dark:text-indigo-400',
    },
    success: {
        bg: 'bg-emerald-50 dark:bg-emerald-500/8',
        border: 'border-emerald-200 dark:border-emerald-900/20',
        iconBg: 'bg-emerald-500/15',
        iconColor: '#10b981',
        textColor: 'text-emerald-700 dark:text-emerald-400',
    },
};

const ContextualBanner = ({ banner, onPress, onDismiss }) => {
    const style = SEVERITY_STYLES[banner.severity] || SEVERITY_STYLES.info;

    return (
        <ScalePress onPress={onPress} activeScale={0.98}>
            <View className={`flex-row items-center gap-3 px-4 py-3 rounded-2xl border ${style.bg} ${style.border}`}>
                <View className={`h-8 w-8 rounded-xl items-center justify-center ${style.iconBg}`}>
                    <MaterialIcons name={banner.icon} size={16} color={style.iconColor} />
                </View>
                <Text
                    className={`flex-1 text-sm font-semibold text-slate-700 dark:text-slate-300`}
                    numberOfLines={2}
                >
                    {banner.message}
                </Text>
                {banner.dismissable && onDismiss && (
                    <TouchableOpacity
                        onPress={(e) => {
                            e.stopPropagation?.();
                            onDismiss(banner.id);
                        }}
                        hitSlop={8}
                        className="h-6 w-6 items-center justify-center"
                    >
                        <MaterialIcons name="close" size={14} color="#94A3B8" />
                    </TouchableOpacity>
                )}
            </View>
        </ScalePress>
    );
};

export default ContextualBanner;
