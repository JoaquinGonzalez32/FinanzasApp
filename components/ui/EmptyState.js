/**
 * EmptyState — Reusable empty/placeholder component
 *
 * Shows icon, title, subtitle, and optional CTA button.
 * Used when lists are empty or data hasn't loaded yet.
 */
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const EmptyState = ({
    icon = 'inbox',
    title,
    subtitle,
    actionLabel,
    onAction,
    compact = false,
}) => {
    return (
        <View className={`items-center ${compact ? 'py-8' : 'py-16'} px-5`}>
            <View className={`${compact ? 'h-14 w-14 rounded-2xl' : 'h-20 w-20 rounded-3xl'} bg-slate-100 dark:bg-slate-800 items-center justify-center mb-4`}>
                <MaterialIcons
                    name={icon}
                    size={compact ? 24 : 36}
                    color="#94A3B8"
                />
            </View>
            {title && (
                <Text className="text-slate-900 dark:text-white text-base font-bold text-center">
                    {title}
                </Text>
            )}
            {subtitle && (
                <Text className="text-slate-400 text-sm mt-2 text-center max-w-[280px]">
                    {subtitle}
                </Text>
            )}
            {actionLabel && onAction && (
                <TouchableOpacity
                    onPress={onAction}
                    className="mt-5 bg-primary px-6 py-3 rounded-xl flex-row items-center gap-2"
                >
                    <MaterialIcons name="add" size={18} color="white" />
                    <Text className="text-white font-bold text-sm">{actionLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

export default EmptyState;
