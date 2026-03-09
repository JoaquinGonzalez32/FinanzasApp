import { View, Text, TouchableOpacity, Animated as RNAnimated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useEffect, useState, useMemo } from 'react';
import { formatCurrency, getCurrencySymbol } from '../../../lib/helpers';
import { AnimatedProgressBar, SkeletonLoader } from '../../../../components/ui';

function AnimatedCounter({ value, currency, size = 'large' }) {
    const animValue = useRef(new RNAnimated.Value(0)).current;
    const [display, setDisplay] = useState(0);

    useEffect(() => {
        animValue.setValue(0);
        RNAnimated.timing(animValue, {
            toValue: value,
            duration: 800,
            useNativeDriver: false,
        }).start();
    }, [value]);

    useEffect(() => {
        const id = animValue.addListener(({ value: v }) => setDisplay(Math.round(v)));
        return () => animValue.removeListener(id);
    }, []);

    const sizeClass = size === 'large'
        ? 'text-display-lg font-extrabold'
        : 'text-xl font-extrabold';

    return (
        <Text className={`${sizeClass} text-white tracking-tight`}>
            {formatCurrency(display, currency)}
        </Text>
    );
}

function budgetBarColor(pct) {
    if (pct >= 100) return '#EF4444';
    if (pct >= 85) return '#F59E0B';
    if (pct >= 65) return '#818CF8';
    return '#10B981';
}

function getPaceIndicator(budgetProgress, daysInMonth) {
    if (!budgetProgress) return null;
    const now = new Date();
    const dayOfMonth = now.getDate();
    const expectedPct = (dayOfMonth / daysInMonth) * 100;
    const actualPct = budgetProgress.percentage;

    if (actualPct > expectedPct + 15) return { text: 'Excedido', icon: 'error-outline', color: '#EF4444' };
    if (actualPct > expectedPct + 5) return { text: 'Cuidado', icon: 'warning', color: '#F59E0B' };
    return { text: 'En ritmo', icon: 'check-circle', color: '#10B981' };
}

/** Single currency block within the "Todas" multi-currency layout */
function CurrencyBlock({ currency, expense, budget, isOnly }) {
    const progressColor = budget ? budgetBarColor(budget.percentage) : '#10B981';

    return (
        <View className={isOnly ? '' : 'flex-1'}>
            <Text className="text-xs font-bold text-white/50 uppercase tracking-wider mb-1">
                {getCurrencySymbol(currency)}
            </Text>
            <AnimatedCounter value={expense} currency={currency} size={isOnly ? 'large' : 'medium'} />
            {budget ? (
                <>
                    <View className="mt-2">
                        <AnimatedProgressBar
                            percentage={budget.percentage}
                            color={progressColor}
                            height={5}
                            delay={500}
                            trackColor="rgba(255,255,255,0.15)"
                        />
                    </View>
                    <Text className="text-xs text-white/50 font-medium mt-1.5">
                        de {formatCurrency(budget.planned, currency)} plan
                    </Text>
                </>
            ) : (
                <Text className="text-xs text-white/30 font-medium mt-2">sin plan</Text>
            )}
        </View>
    );
}

const MonthStatusCard = ({
    monthTotalExpense,
    primaryCurrency,
    expenseByCurrency,
    isAllAccounts,
    budgetProgress,
    budgetByCurrency,
    savingsRate,
    monthTotalIncome,
    incomeByCurrency,
    loading,
    refreshing,
    onPlanPress,
    accounts,
    onAccountPress,
}) => {
    const daysInMonth = useMemo(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    }, []);

    const progressColor = budgetProgress ? budgetBarColor(budgetProgress.percentage) : '#10B981';
    const pace = getPaceIndicator(budgetProgress, daysInMonth);
    const multiCurrencyIncome = isAllAccounts && Object.keys(incomeByCurrency).length > 1;
    const hasSavingsRate = savingsRate !== null && savingsRate !== undefined;

    // For "Todas": build active currency list (currencies with any expense or income)
    const activeCurrencies = useMemo(() => {
        if (!isAllAccounts) return [];
        const allCurs = new Set([
            ...Object.keys(expenseByCurrency),
            ...Object.keys(incomeByCurrency),
        ]);
        return Array.from(allCurs).filter(
            cur => (expenseByCurrency[cur] || 0) > 0 || (incomeByCurrency[cur] || 0) > 0
        );
    }, [isAllAccounts, expenseByCurrency, incomeByCurrency]);

    const showMultiCurrency = isAllAccounts && activeCurrencies.length > 1;

    // Aggregate budget across currencies for shared pace indicator
    const anyBudget = showMultiCurrency
        ? budgetByCurrency && Object.values(budgetByCurrency).some(Boolean)
        : !!budgetProgress;
    const aggregatePace = showMultiCurrency
        ? getPaceIndicator(budgetProgress, daysInMonth)
        : pace;

    return (
        <View className="rounded-3xl overflow-hidden shadow-lg">
            <LinearGradient
                colors={['#6366F1', '#4F46E5', '#4338CA']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="px-5 pt-6 pb-5"
            >
                {/* Decorative circles */}
                <View className="absolute -top-8 -right-8 w-32 h-32 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />
                <View className="absolute bottom-2 -left-6 w-20 h-20 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />

                <Text className="text-xs font-semibold text-indigo-200 uppercase tracking-widest mb-2">
                    Gastado este mes
                </Text>

                {loading && !refreshing ? (
                    <View className="h-14 w-48 bg-white/10 rounded-2xl" />
                ) : showMultiCurrency ? (
                    /* ═══ MULTI-CURRENCY LAYOUT (Todas) ═══ */
                    <View className="flex-row gap-4 mt-1">
                        {activeCurrencies.map(cur => (
                            <CurrencyBlock
                                key={cur}
                                currency={cur}
                                expense={expenseByCurrency[cur] || 0}
                                budget={budgetByCurrency?.[cur] || null}
                                isOnly={activeCurrencies.length === 1}
                            />
                        ))}
                    </View>
                ) : isAllAccounts && activeCurrencies.length === 1 ? (
                    /* Single active currency in "Todas" */
                    <>
                        <AnimatedCounter value={expenseByCurrency[activeCurrencies[0]] || 0} currency={activeCurrencies[0]} />
                        {budgetByCurrency?.[activeCurrencies[0]] && (
                            <>
                                <View className="mt-4">
                                    <AnimatedProgressBar
                                        percentage={budgetByCurrency[activeCurrencies[0]].percentage}
                                        color={budgetBarColor(budgetByCurrency[activeCurrencies[0]].percentage)}
                                        height={6}
                                        delay={500}
                                        trackColor="rgba(255,255,255,0.15)"
                                    />
                                </View>
                                <View className="flex-row items-center justify-between mt-3">
                                    <View className="flex-row items-center gap-1.5">
                                        <View className="h-5 w-5 rounded-full bg-white/15 items-center justify-center">
                                            <MaterialIcons name="speed" size={11} color="rgba(255,255,255,0.9)" />
                                        </View>
                                        <Text className="text-sm font-bold text-white/90">
                                            {formatCurrency(budgetByCurrency[activeCurrencies[0]].dailyBudget, activeCurrencies[0])}/dia
                                        </Text>
                                    </View>
                                    <Text className="text-xs text-white/60 font-medium">
                                        {budgetByCurrency[activeCurrencies[0]].daysLeft} dia{budgetByCurrency[activeCurrencies[0]].daysLeft !== 1 ? 's' : ''} · {formatCurrency(budgetByCurrency[activeCurrencies[0]].remaining, activeCurrencies[0])} disp.
                                    </Text>
                                </View>
                            </>
                        )}
                    </>
                ) : (
                    /* ═══ SINGLE ACCOUNT LAYOUT ═══ */
                    <>
                        <AnimatedCounter value={monthTotalExpense} currency={primaryCurrency} />
                        {budgetProgress && (
                            <>
                                <View className="mt-4">
                                    <AnimatedProgressBar
                                        percentage={budgetProgress.percentage}
                                        color={progressColor}
                                        height={6}
                                        delay={500}
                                        trackColor="rgba(255,255,255,0.15)"
                                    />
                                </View>
                                <View className="flex-row items-center justify-between mt-3">
                                    <View className="flex-row items-center gap-1.5">
                                        <View className="h-5 w-5 rounded-full bg-white/15 items-center justify-center">
                                            <MaterialIcons name="speed" size={11} color="rgba(255,255,255,0.9)" />
                                        </View>
                                        <Text className="text-sm font-bold text-white/90">
                                            {formatCurrency(budgetProgress.dailyBudget, primaryCurrency)}/dia
                                        </Text>
                                    </View>
                                    <Text className="text-xs text-white/60 font-medium">
                                        {budgetProgress.daysLeft} dia{budgetProgress.daysLeft !== 1 ? 's' : ''} · {formatCurrency(budgetProgress.remaining, primaryCurrency)} disp.
                                    </Text>
                                </View>
                            </>
                        )}
                    </>
                )}

                {/* Shared: daily rate row for multi-currency with budget */}
                {showMultiCurrency && anyBudget && budgetProgress && (
                    <View className="flex-row items-center justify-between mt-3">
                        <View className="flex-row items-center gap-1.5">
                            <View className="h-5 w-5 rounded-full bg-white/15 items-center justify-center">
                                <MaterialIcons name="speed" size={11} color="rgba(255,255,255,0.9)" />
                            </View>
                            <Text className="text-sm font-bold text-white/90">
                                {budgetProgress.daysLeft} dia{budgetProgress.daysLeft !== 1 ? 's' : ''} restante{budgetProgress.daysLeft !== 1 ? 's' : ''}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Plan CTA when no budget */}
                {!anyBudget && !loading && (
                    <TouchableOpacity
                        onPress={onPlanPress}
                        className="flex-row items-center gap-2 mt-4 bg-white/15 self-start px-4 py-2.5 rounded-xl"
                    >
                        <MaterialIcons name="pie-chart-outline" size={16} color="rgba(255,255,255,0.9)" />
                        <Text className="text-sm font-bold text-white/90">Planifica tu mes</Text>
                    </TouchableOpacity>
                )}

                {/* Bottom row: savings rate + pace + income + planned */}
                <View className="flex-row items-center gap-2 mt-4 flex-wrap">
                    {/* Savings rate chip */}
                    {hasSavingsRate && (
                        <View className="flex-row items-center gap-1 bg-white/12 px-2.5 py-1.5 rounded-lg">
                            <MaterialIcons
                                name={savingsRate >= 20 ? 'savings' : 'account-balance-wallet'}
                                size={12}
                                color={savingsRate >= 20 ? '#6EE7B7' : savingsRate >= 0 ? 'rgba(255,255,255,0.7)' : '#FCA5A5'}
                            />
                            <Text className={`text-xs font-bold ${savingsRate >= 20 ? 'text-emerald-300' : savingsRate >= 0 ? 'text-white/70' : 'text-red-300'}`}>
                                Ahorro {Math.round(savingsRate)}%
                            </Text>
                        </View>
                    )}

                    {/* Pace indicator */}
                    {aggregatePace && (
                        <View className="flex-row items-center gap-1 bg-white/12 px-2.5 py-1.5 rounded-lg">
                            <MaterialIcons name={aggregatePace.icon} size={12} color={aggregatePace.color} />
                            <Text style={{ color: aggregatePace.color }} className="text-xs font-bold">
                                {aggregatePace.text}
                            </Text>
                        </View>
                    )}

                    {/* Income chip(s) */}
                    {!loading && monthTotalIncome > 0 && (
                        multiCurrencyIncome ? (
                            Object.entries(incomeByCurrency).map(([cur, total]) => (
                                <View key={cur} className="flex-row items-center gap-1 bg-white/12 px-2.5 py-1.5 rounded-lg">
                                    <MaterialIcons name="arrow-upward" size={10} color="#6EE7B7" />
                                    <Text className="text-xs font-bold text-emerald-300">
                                        +{formatCurrency(total, cur)}
                                    </Text>
                                </View>
                            ))
                        ) : (
                            <View className="flex-row items-center gap-1 bg-white/12 px-2.5 py-1.5 rounded-lg">
                                <MaterialIcons name="arrow-upward" size={10} color="#6EE7B7" />
                                <Text className="text-xs font-bold text-emerald-300">
                                    +{formatCurrency(monthTotalIncome, primaryCurrency)}
                                </Text>
                            </View>
                        )
                    )}

                    {/* Planned chip (single account only) */}
                    {!showMultiCurrency && budgetProgress && (
                        <View className="flex-row items-center gap-1 bg-white/12 px-2.5 py-1.5 rounded-lg">
                            <MaterialIcons name="event-note" size={10} color="rgba(255,255,255,0.6)" />
                            <Text className="text-xs font-bold text-white/60">
                                {formatCurrency(budgetProgress.planned, primaryCurrency)} plan
                            </Text>
                        </View>
                    )}
                </View>

                {/* Mini account balances (Todas only) */}
                {isAllAccounts && accounts && accounts.length > 0 && !loading && (
                    <View className="flex-row flex-wrap gap-2 mt-3 pt-3 border-t border-white/10">
                        {accounts.map(acc => (
                            <TouchableOpacity
                                key={acc.id}
                                onPress={() => onAccountPress?.(acc.id)}
                                className="flex-row items-center gap-1.5 bg-white/8 px-2.5 py-1.5 rounded-lg"
                            >
                                <View className="h-2 w-2 rounded-full" style={{ backgroundColor: acc.color || '#94A3B8' }} />
                                <Text className="text-xs font-semibold text-white/70" numberOfLines={1}>
                                    {acc.name}
                                </Text>
                                <Text className="text-xs font-bold text-white/90">
                                    {formatCurrency(acc.balance, acc.currency)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </LinearGradient>
        </View>
    );
};

export default MonthStatusCard;
