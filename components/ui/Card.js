/**
 * Card — Primary content container
 *
 * Variants:
 *   elevated  — White card with prominent shadow (hero cards)
 *   outlined  — White card with subtle border + shadow (default)
 *   flat      — Tinted background, no shadow (secondary surfaces)
 *   warning   — Amber-tinted border for budget warnings
 *   critical  — Red-tinted border for exceeded budgets
 */
import { View, Platform } from 'react-native';

const VARIANTS = {
    elevated: 'bg-white dark:bg-card-dark shadow-lg rounded-2xl',
    outlined: 'bg-white dark:bg-card-dark shadow-sm rounded-2xl border border-slate-200 dark:border-slate-700',
    flat: 'bg-slate-100 dark:bg-slate-800 rounded-xl',
    warning: 'bg-white dark:bg-card-dark shadow-sm rounded-2xl border border-amber-200 dark:border-amber-900/30',
    critical: 'bg-white dark:bg-card-dark shadow-sm rounded-2xl border border-red-200 dark:border-red-900/30',
};

const SHADOW = Platform.select({
    ios: {
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
    },
    android: { elevation: 3 },
    default: {},
});

const Card = ({
    children,
    variant = 'outlined',
    className: extraClass = '',
    style,
    noPadding = false,
}) => {
    return (
        <View
            className={`${noPadding ? '' : 'p-4'} ${VARIANTS[variant] || VARIANTS.outlined} ${extraClass}`}
            style={[variant !== 'flat' ? SHADOW : undefined, style]}
        >
            {children}
        </View>
    );
};

export default Card;
