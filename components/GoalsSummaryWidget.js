import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { ScalePress, AnimatedProgressBar } from './ui';
import { getCategoryStyle } from '../src/lib/helpers';
import { goalProgress } from '../src/lib/goalHelpers';

export default function GoalsSummaryWidget({ goals, onPress }) {
    if (!goals || goals.length === 0) return null;

    return (
        <ScalePress onPress={onPress}>
            <View className="bg-white/75 dark:bg-card-dark rounded-2xl border border-white/60 dark:border-slate-800 shadow-md p-4">
                {/* Header */}
                <View className="flex-row items-center justify-between mb-3">
                    <Text className="text-sm font-bold text-stone-900 dark:text-white">Metas de Ahorro</Text>
                    <MaterialIcons name="chevron-right" size={18} color="#a8a29e" />
                </View>

                {/* Compact goal rows */}
                <View className="gap-3">
                    {goals.map((goal) => {
                        const pct = goalProgress(goal);
                        const style = getCategoryStyle(goal.color);
                        return (
                            <View key={goal.id} className="flex-row items-center gap-3">
                                <View className={`h-8 w-8 rounded-lg items-center justify-center ${style.bg}`}>
                                    <MaterialIcons name={goal.icon || 'flag'} size={16} color={style.hex} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-xs font-semibold text-stone-700 dark:text-slate-300 mb-1" numberOfLines={1}>
                                        {goal.name}
                                    </Text>
                                    <AnimatedProgressBar
                                        percentage={pct}
                                        color={style.hex}
                                        height={4}
                                        delay={300}
                                    />
                                </View>
                                <Text className="text-xs font-bold text-stone-500 dark:text-slate-400 w-10 text-right">
                                    {Math.round(pct)}%
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>
        </ScalePress>
    );
}
