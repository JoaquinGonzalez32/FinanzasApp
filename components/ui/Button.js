import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const VARIANTS = {
    primary: {
        container: 'bg-primary shadow-sm shadow-primary/20',
        text: 'text-white',
        iconColor: '#ffffff',
    },
    secondary: {
        container: 'bg-white dark:bg-input-dark dark:border dark:border-slate-700',
        text: 'text-slate-900 dark:text-white',
        iconColor: '#6366F1',
    },
    ghost: {
        container: 'bg-transparent',
        text: 'text-primary',
        iconColor: '#6366F1',
    },
    danger: {
        container: 'bg-red-500/10',
        text: 'text-red-500',
        iconColor: '#ef4444',
    },
};

const SIZES = {
    sm: { container: 'h-10 px-4 rounded-xl', text: 'text-xs', iconSize: 16 },
    md: { container: 'h-12 px-5 rounded-xl', text: 'text-sm', iconSize: 18 },
    lg: { container: 'h-14 px-6 rounded-2xl', text: 'text-base', iconSize: 20 },
};

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    icon,
    iconRight,
    loading = false,
    disabled = false,
    fullWidth = false,
    onPress,
    className: extraClass = '',
}) => {
    const v = VARIANTS[variant] || VARIANTS.primary;
    const s = SIZES[size] || SIZES.md;
    const isDisabled = disabled || loading;

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            disabled={isDisabled}
            className={`flex-row items-center justify-center gap-2 ${s.container} ${v.container} ${fullWidth ? 'w-full' : ''} ${isDisabled ? 'opacity-50' : ''} ${extraClass}`}
        >
            {loading ? (
                <ActivityIndicator size="small" color={v.iconColor} />
            ) : (
                <>
                    {icon && !iconRight && (
                        <MaterialIcons name={icon} size={s.iconSize} color={v.iconColor} />
                    )}
                    <Text className={`font-semibold ${s.text} ${v.text}`}>
                        {children}
                    </Text>
                    {icon && iconRight && (
                        <MaterialIcons name={icon} size={s.iconSize} color={v.iconColor} />
                    )}
                </>
            )}
        </TouchableOpacity>
    );
};

export default Button;
