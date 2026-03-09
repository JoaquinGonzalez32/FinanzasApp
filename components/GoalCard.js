import { View, Text, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ScalePress, AnimatedProgressBar } from './ui';
import { getCategoryStyle } from '../src/lib/helpers';
import { formatCurrency } from '../src/lib/helpers';
import { goalProgress, goalPaceStatus, paceLabel, formatTimeRemaining } from '../src/lib/goalHelpers';

export default function GoalCard({ goal, onPress, currency }) {
    const cur = currency ?? goal.currency;
    const pct = goalProgress(goal);
    const pace = goalPaceStatus(goal);
    const pLabel = paceLabel(pace);
    const style = getCategoryStyle(goal.color);

    return (
        <ScalePress onPress={onPress}>
            <View
                className="bg-white/75 dark:bg-card-dark p-5 rounded-2xl border border-white/60 dark:border-slate-800 shadow-md"
                style={Platform.select({
                    ios: {
                        shadowColor: '#6B7FBF',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.08,
                        shadowRadius: 8,
                    },
                    default: {},
                })}
            >
                {/* Top row: icon + name/deadline + pace badge */}
                <View className="flex-row items-center gap-3 mb-3">
                    <View className={`h-10 w-10 rounded-xl items-center justify-center ${style.bg}`}>
                        <MaterialIcons name={goal.icon || 'flag'} size={22} color={style.hex} />
                    </View>
                    <View className="flex-1">
                        <Text className="text-sm font-bold text-stone-900 dark:text-white" numberOfLines={1}>{goal.name}</Text>
                        {goal.deadline && (
                            <Text className="text-xs text-stone-400 mt-0.5">{formatTimeRemaining(goal.deadline)}</Text>
                        )}
                    </View>
                    <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: pLabel.color + '15' }}>
                        <Text className="text-xs font-bold" style={{ color: pLabel.color }}>{pLabel.text}</Text>
                    </View>
                </View>

                {/* Amounts */}
                <View className="flex-row justify-between mb-2">
                    <Text className="text-sm font-semibold text-stone-700 dark:text-slate-300">
                        {formatCurrency(goal.current_amount, cur)}
                    </Text>
                    <Text className="text-sm font-semibold text-stone-400">
                        / {formatCurrency(goal.target_amount, cur)}
                    </Text>
                </View>

                {/* Progress bar */}
                <View className="flex-row items-center gap-2">
                    <View className="flex-1">
                        <AnimatedProgressBar
                            percentage={pct}
                            color={style.hex}
                            height={6}
                            delay={200}
                        />
                    </View>
                    <Text className="text-xs font-bold text-stone-500 dark:text-slate-400 w-10 text-right">
                        {Math.round(pct)}%
                    </Text>
                </View>
            </View>
        </ScalePress>
    );
}
