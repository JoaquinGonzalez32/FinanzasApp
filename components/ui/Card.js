import { View, Platform } from 'react-native';

const VARIANTS = {
    elevated: 'bg-white dark:bg-card-dark shadow-lg rounded-2xl',
    outlined: 'bg-white/75 dark:bg-surface-dark shadow-sm rounded-2xl border border-white/60 dark:border-slate-800',
    flat: 'bg-frost-light dark:bg-input-dark rounded-xl',
};

const FROST_SHADOW = Platform.select({
    ios: {
        shadowColor: '#6B7FBF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
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
}) => {
    return (
        <View
            className={`p-4 ${VARIANTS[variant] || VARIANTS.outlined} ${extraClass}`}
            style={[variant !== 'flat' ? FROST_SHADOW : undefined, style]}
        >
            {children}
        </View>
    );
};

export default Card;
