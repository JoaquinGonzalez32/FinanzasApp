/**
 * Amount — Formatted currency display component
 *
 * Renders monetary values with proper currency symbol, size, and semantic color.
 * Handles sign prefix (+ / -) and magnitude-based visual weight.
 *
 * Variants:
 *   display  — Hero numbers (48px, extrabold)
 *   large    — Card headers (20px, bold)
 *   default  — List items (14px, bold)
 *   compact  — Small inline (12px, semibold)
 */
import { Text } from 'react-native';
import { formatCurrency } from '../../src/lib/helpers';

const SIZES = {
    display: 'text-display-lg font-extrabold',
    large: 'text-xl font-extrabold',
    default: 'text-sm font-bold',
    compact: 'text-xs font-semibold',
};

const COLORS = {
    income: 'text-emerald-500',
    expense: 'text-red-500',
    neutral: 'text-slate-900 dark:text-white',
    muted: 'text-slate-500 dark:text-slate-400',
    inverse: 'text-white',
};

const Amount = ({
    value,
    currency,
    type,
    size = 'default',
    showSign = false,
    color,
    className: extra = '',
    style,
}) => {
    const sizeClass = SIZES[size] || SIZES.default;

    let colorClass;
    if (color) {
        colorClass = COLORS[color] || color;
    } else if (type === 'income') {
        colorClass = COLORS.income;
    } else if (type === 'expense') {
        colorClass = COLORS.expense;
    } else {
        colorClass = COLORS.neutral;
    }

    const sign = showSign
        ? type === 'income' ? '+' : type === 'expense' ? '-' : ''
        : '';

    const formatted = formatCurrency(Math.abs(value), currency);

    return (
        <Text className={`${sizeClass} ${colorClass} ${extra}`} style={style}>
            {sign}{formatted}
        </Text>
    );
};

export default Amount;
