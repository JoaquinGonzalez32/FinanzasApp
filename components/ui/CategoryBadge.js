/**
 * CategoryBadge — Icon + name + color for a category
 *
 * Variants:
 *   default  — Icon circle + name (list rows)
 *   compact  — Small icon only (grids, filters)
 *   chip     — Pill with icon + name (filter chips)
 */
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getCategoryStyle } from '../../src/lib/helpers';

const CategoryBadge = ({
    icon = 'category',
    name,
    color,
    variant = 'default',
    active = false,
    className: extra = '',
}) => {
    const style = getCategoryStyle(color);

    if (variant === 'compact') {
        return (
            <View
                className={`h-9 w-9 rounded-xl items-center justify-center ${active ? 'bg-primary' : style.bg} ${extra}`}
            >
                <MaterialIcons
                    name={icon}
                    size={18}
                    color={active ? '#ffffff' : style.hex}
                />
            </View>
        );
    }

    if (variant === 'chip') {
        return (
            <View
                className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full ${
                    active
                        ? 'bg-primary'
                        : 'bg-slate-100 dark:bg-slate-800'
                } ${extra}`}
            >
                <MaterialIcons
                    name={icon}
                    size={12}
                    color={active ? '#ffffff' : style.hex}
                />
                {name && (
                    <Text
                        className={`text-xs font-semibold ${
                            active ? 'text-white' : 'text-slate-600 dark:text-slate-400'
                        }`}
                        numberOfLines={1}
                    >
                        {name}
                    </Text>
                )}
            </View>
        );
    }

    // default variant
    return (
        <View className={`flex-row items-center gap-3 ${extra}`}>
            <View className={`h-9 w-9 rounded-xl items-center justify-center ${style.bg}`}>
                <MaterialIcons name={icon} size={18} color={style.hex} />
            </View>
            {name && (
                <Text
                    className="text-sm font-semibold text-slate-800 dark:text-white"
                    numberOfLines={1}
                >
                    {name}
                </Text>
            )}
        </View>
    );
};

export default CategoryBadge;
