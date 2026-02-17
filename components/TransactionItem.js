import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const TransactionItem = ({ icon, label, sub, amount, colorClass, iconBg, iconColor, onPress, onLongPress, onDelete }) => {
    const Container = onPress || onLongPress ? TouchableOpacity : View;
    const containerProps = onPress || onLongPress
        ? { onPress, onLongPress, activeOpacity: 0.7 }
        : {};

    return (
        <Container
            {...containerProps}
            className="flex-row items-center gap-4 bg-white dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 mb-3"
        >
            <View className={`h-12 w-12 rounded-lg ${iconBg} items-center justify-center`}>
                <MaterialIcons name={icon} size={24} color={iconColor || '#475569'} />
            </View>
            <View className="flex-1">
                <Text className="font-bold text-sm text-slate-900 dark:text-white">{label}</Text>
                <Text className="text-xs text-slate-500">{sub}</Text>
            </View>
            <Text className={`font-extrabold text-sm ${colorClass}`}>{amount}</Text>
            {onDelete && (
                <TouchableOpacity
                    onPress={onDelete}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    className="p-1.5 rounded-full active:bg-red-100 dark:active:bg-red-500/20"
                >
                    <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
            )}
        </Container>
    );
};

export default TransactionItem;
