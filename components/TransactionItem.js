import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const TransactionItem = ({ icon, label, sub, amount, colorClass, iconBg, iconColor, onPress, onLongPress, onDelete }) => {
    console.log('[TransactionItem] render', label, 'onDelete:', typeof onDelete);

    return (
        <View className="flex-row items-center bg-white dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/60 mb-3 overflow-hidden">
            <TouchableOpacity
                onPress={() => {
                    console.log('[TransactionItem] ROW pressed', label);
                    if (onPress) onPress();
                }}
                onLongPress={() => {
                    console.log('[TransactionItem] ROW long pressed', label);
                    if (onLongPress) onLongPress();
                }}
                activeOpacity={0.7}
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
                    onPress={() => {
                        console.log('[TransactionItem] DELETE pressed', label);
                        onDelete();
                    }}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    activeOpacity={0.5}
                    style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,0,0,0.1)' }}
                >
                    <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
            )}
        </View>
    );
};

export default TransactionItem;
