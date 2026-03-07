import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRef, useCallback } from 'react';

const TransactionItem = ({ icon, label, sub, amount, colorClass, iconBg, iconColor, onPress, onLongPress, onDelete }) => {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = useCallback(() => {
        Animated.spring(scale, {
            toValue: 0.975,
            tension: 150,
            friction: 8,
            useNativeDriver: true,
        }).start();
    }, []);

    const handlePressOut = useCallback(() => {
        Animated.spring(scale, {
            toValue: 1,
            tension: 150,
            friction: 8,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <Animated.View style={{ transform: [{ scale }] }}>
            <TouchableOpacity
                onPress={onPress}
                onLongPress={onLongPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.7}
                className="flex-row items-center gap-3 px-4 py-3"
            >
                <View className={`h-9 w-9 rounded-full ${iconBg} items-center justify-center`}>
                    <MaterialIcons name={icon} size={16} color={iconColor || '#475569'} />
                </View>
                <View className="flex-1">
                    <Text className="font-semibold text-sm text-stone-800 dark:text-white">{label}</Text>
                    {sub ? <Text className="text-xs text-stone-400 dark:text-slate-500 mt-0.5">{sub}</Text> : null}
                </View>
                <Text className={`font-bold text-sm ${colorClass}`}>{amount}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

export default TransactionItem;
