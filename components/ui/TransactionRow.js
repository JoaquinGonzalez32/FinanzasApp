/**
 * TransactionRow — Single transaction display
 *
 * Improvements over TransactionItem:
 * - Amount magnitude differentiation (larger amounts are visually bolder)
 * - Semantic coloring for expense/income
 * - Scale-on-press animation
 * - Swipe-to-delete hint (long press)
 */
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRef, useCallback } from 'react';
import { formatCurrency, getCategoryStyle } from '../../src/lib/helpers';

/** Threshold above which amounts get extra visual weight */
const HIGH_AMOUNT_THRESHOLD = 500;

const TransactionRow = ({
    transaction,
    currency,
    onPress,
    onLongPress,
    showDate = false,
}) => {
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

    const cat = transaction.category;
    const style = getCategoryStyle(cat?.color);
    const isIncome = transaction.type === 'income';
    const amount = Number(transaction.amount);
    const isHighAmount = amount >= HIGH_AMOUNT_THRESHOLD;

    const sign = isIncome ? '+' : '-';
    const amountColor = isIncome ? 'text-emerald-500' : 'text-slate-900 dark:text-white';
    const amountWeight = isHighAmount ? 'font-extrabold' : 'font-bold';

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
                <View className={`h-10 w-10 rounded-xl ${style.bg} items-center justify-center`}>
                    <MaterialIcons name={cat?.icon ?? 'payments'} size={18} color={style.hex} />
                </View>

                <View className="flex-1 min-w-0">
                    <Text
                        className="text-sm font-semibold text-slate-900 dark:text-white"
                        numberOfLines={1}
                    >
                        {cat?.name ?? 'Sin categoria'}
                    </Text>
                    <Text
                        className="text-xs text-slate-400 dark:text-slate-500 mt-0.5"
                        numberOfLines={1}
                    >
                        {transaction.note || (showDate ? transaction.date : '')}
                    </Text>
                </View>

                <Text className={`text-sm ${amountWeight} ${amountColor}`}>
                    {sign} {formatCurrency(amount, currency)}
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

export default TransactionRow;
