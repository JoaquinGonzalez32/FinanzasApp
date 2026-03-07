import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getCategoryStyle, formatCurrency } from '../../../../lib/helpers';

export default function ComparisonCard({ comparison, currency }) {
    if (!comparison) return null;

    const { periodA, periodB, totalsA, totalsB, percentChange: pctChange } = comparison;

    return (
        <View className="bg-white/75 dark:bg-surface-dark rounded-2xl p-4 border border-white/60 dark:border-slate-800 shadow-sm">
            {/* Period headers */}
            <View className="flex-row items-center justify-between mb-4">
                <View className="flex-1 items-center">
                    <Text className="text-xs font-semibold text-stone-400 dark:text-slate-500 uppercase tracking-wider">
                        {periodA.label}
                    </Text>
                </View>
                <MaterialIcons name="compare-arrows" size={18} color="#a8a29e" />
                <View className="flex-1 items-center">
                    <Text className="text-xs font-semibold text-stone-400 dark:text-slate-500 uppercase tracking-wider">
                        {periodB.label}
                    </Text>
                </View>
            </View>

            {/* Totals comparison */}
            <View className="gap-3">
                <ComparisonRow
                    label="Gastos"
                    valueA={formatCurrency(totalsA.expense, currency)}
                    valueB={formatCurrency(totalsB.expense, currency)}
                    change={pctChange.expense}
                    invertColor
                />
                <ComparisonRow
                    label="Ingresos"
                    valueA={formatCurrency(totalsA.income, currency)}
                    valueB={formatCurrency(totalsB.income, currency)}
                    change={pctChange.income}
                />
                <View className="h-px bg-stone-100 dark:bg-slate-800" />
                <ComparisonRow
                    label="Balance"
                    valueA={formatCurrency(Math.abs(totalsA.net), currency)}
                    valueB={formatCurrency(Math.abs(totalsB.net), currency)}
                    change={pctChange.net}
                    prefix={{ a: totalsA.net >= 0 ? '+' : '-', b: totalsB.net >= 0 ? '+' : '-' }}
                />
                <ComparisonRow
                    label="Ahorro"
                    valueA={`${Math.round(totalsA.savingsRate)}%`}
                    valueB={`${Math.round(totalsB.savingsRate)}%`}
                    change={pctChange.savingsRate}
                />
            </View>

            {/* Category breakdown */}
            {comparison.categoryComparison.length > 0 && (
                <View className="mt-4 pt-3 border-t border-stone-100 dark:border-slate-800">
                    <Text className="text-xs font-semibold text-stone-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                        Por Categoria
                    </Text>
                    <View className="gap-2.5">
                        {comparison.categoryComparison.slice(0, 6).map((cat) => {
                            const style = getCategoryStyle(cat.categoryColor);
                            const isUp = cat.difference > 0;
                            const pct = Math.abs(Math.round(cat.percentChange));
                            return (
                                <View key={cat.categoryId} className="flex-row items-center gap-2.5">
                                    <View className={`h-7 w-7 rounded-lg items-center justify-center ${style.bg}`}>
                                        <MaterialIcons name={cat.categoryIcon} size={14} color={style.hex} />
                                    </View>
                                    <Text className="flex-1 text-sm font-medium text-stone-700 dark:text-slate-300">
                                        {cat.categoryName}
                                    </Text>
                                    <View className="flex-row items-center gap-1">
                                        {cat.difference !== 0 && (
                                            <MaterialIcons
                                                name={isUp ? 'arrow-upward' : 'arrow-downward'}
                                                size={12}
                                                color={isUp ? '#ef4444' : '#10b981'}
                                            />
                                        )}
                                        <Text className={`text-xs font-bold ${isUp ? 'text-red-500' : cat.difference < 0 ? 'text-emerald-500' : 'text-stone-400'}`}>
                                            {cat.difference === 0 ? '=' : `${pct}%`}
                                        </Text>
                                    </View>
                                    <Text className="text-xs text-stone-500 dark:text-slate-400 w-20 text-right font-semibold">
                                        {formatCurrency(cat.amountB, currency)}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
            )}

            {/* Summary */}
            {comparison.summary && (
                <View className="mt-4 bg-frost dark:bg-input-dark rounded-xl p-3">
                    <Text className="text-xs text-stone-600 dark:text-slate-300 leading-5">
                        {comparison.summary}
                    </Text>
                </View>
            )}
        </View>
    );
}

function ComparisonRow({ label, valueA, valueB, change, invertColor, prefix }) {
    const isPositive = change > 0;
    // For expenses: up is bad (red), for others: up is good (green)
    const changeColor = invertColor
        ? (isPositive ? 'text-red-500' : 'text-emerald-500')
        : (isPositive ? 'text-emerald-500' : 'text-red-500');

    return (
        <View className="flex-row items-center">
            <Text className="text-xs font-medium text-stone-500 dark:text-slate-400 w-16">{label}</Text>
            <Text className="flex-1 text-sm font-semibold text-stone-700 dark:text-slate-300 text-center">
                {prefix?.a ?? ''}{valueA}
            </Text>
            <View className="w-16 items-center">
                {Math.abs(change) >= 1 ? (
                    <View className="flex-row items-center gap-0.5">
                        <MaterialIcons
                            name={isPositive ? 'arrow-upward' : 'arrow-downward'}
                            size={10}
                            color={invertColor ? (isPositive ? '#ef4444' : '#10b981') : (isPositive ? '#10b981' : '#ef4444')}
                        />
                        <Text className={`text-xs font-bold ${change === 0 ? 'text-stone-400' : changeColor}`}>
                            {Math.abs(Math.round(change))}%
                        </Text>
                    </View>
                ) : (
                    <Text className="text-xs font-medium text-stone-400">=</Text>
                )}
            </View>
            <Text className="flex-1 text-sm font-semibold text-stone-700 dark:text-slate-300 text-center">
                {prefix?.b ?? ''}{valueB}
            </Text>
        </View>
    );
}
