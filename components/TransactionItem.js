import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const TransactionItem = ({ icon, label, sub, amount, colorClass, iconBg, iconColor, onPress, onLongPress, onDelete }) => {
    return (
        <View className="flex-row items-center bg-white dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/60 mb-3 overflow-hidden">
            <TouchableOpacity
                onPress={onPress}
                onLongPress={onLongPress}
                activeOpacity={onPress || onLongPress ? 0.7 : 1}
                className="flex-1 flex-row items-center gap-4 p-3"
            >
                <View className={`h-12 w-12 rounded-lg ${iconBg} items-center justify-center`}>
                    <MaterialIcons name={icon} size={24} color={iconColor || '#475569'} />
                </View>
                <View className="flex-1">
                    <Text className="font-bold text-sm text-slate-900 dark:text-white">{label}</Text>
                    <Text className="text-xs text-slate-500">{sub}</Text>
                </View>
                <Text className={`font-extrabold text-sm ${colorClass}`}>{amount}</Text>
            </TouchableOpacity>
            {onDelete && (
                <TouchableOpacity
                    onPress={onDelete}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    activeOpacity={0.5}
                    style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                >
                    <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
            )}
        </View>
    );
};

export default TransactionItem;
