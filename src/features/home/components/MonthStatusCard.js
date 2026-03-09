import { View, Text, TouchableOpacity, FlatList, Dimensions, Animated as RNAnimated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { formatCurrency, getCurrencySymbol } from '../../../lib/helpers';
import { AnimatedProgressBar, SkeletonLoader } from '../../../../components/ui';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_H_PADDING = 20; // matches px-5 from parent
const CARD_GAP = 12;
const CARD_PEEK = 24;
const CAROUSEL_CARD_WIDTH = SCREEN_WIDTH - CARD_H_PADDING * 2 - CARD_PEEK;

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

    return (
        <Text
            style={{
                fontSize: size === 'large' ? 40 : 22,
                fontWeight: '800',
                color: '#FFFFFF',
                letterSpacing: -0.5,
            }}
        >
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

/* ─── Dots indicator for carousel ─── */
function DotsIndicator({ count, activeIndex, colors }) {
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 12 }}>
            {Array.from({ length: count }, (_, i) => (
                <View
                    key={i}
                    style={{
                        width: activeIndex === i ? 16 : 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: activeIndex === i ? (colors[i] || '#6366F1') : '#CBD5E1',
                    }}
                />
            ))}
        </View>
    );
}

/* ─── Single account card (used in carousel and as standalone) ─── */
function AccountCard({ data, width, onPress, onPlanPress, daysInMonth }) {
    const { account, expense, income, budgetProgress, savingsRate } = data;
    const currency = account.currency;
    const pace = getPaceIndicator(budgetProgress, daysInMonth);
    const hasSavingsRate = savingsRate !== null && savingsRate !== undefined;

    return (
        <TouchableOpacity
            onPress={() => onPress?.(account.id)}
            activeOpacity={0.9}
            style={{ width }}
        >
            <View style={{ borderRadius: 24, overflow: 'hidden' }}>
                <LinearGradient
                    colors={['#6366F1', '#4F46E5', '#4338CA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}
                >
                    {/* Decorative circles */}
                    <View style={{ position: 'absolute', top: -32, right: -32, width: 128, height: 128, borderRadius: 64, backgroundColor: 'rgba(255,255,255,0.08)' }} />
                    <View style={{ position: 'absolute', bottom: 8, left: -24, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.05)' }} />

                    {/* Account name header */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: account.color || '#94A3B8' }} />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.8)' }}>
                            {account.name}
                        </Text>
                    </View>

                    <Text className="text-xs font-semibold text-indigo-200 uppercase tracking-widest mb-2">
                        Gastado este mes
                    </Text>

                    <AnimatedCounter value={expense} currency={currency} />

                    {budgetProgress ? (
                        <View className="mt-4">
                            <AnimatedProgressBar
                                percentage={budgetProgress.percentage}
                                color={budgetBarColor(budgetProgress.percentage)}
                                height={6}
                                delay={500}
                                trackColor="rgba(255,255,255,0.15)"
                            />
                        </View>
                    ) : (
                        <TouchableOpacity
                            onPress={onPlanPress}
                            className="flex-row items-center gap-2 mt-4 bg-white/15 self-start px-4 py-2.5 rounded-xl"
                        >
                            <MaterialIcons name="pie-chart-outline" size={16} color="rgba(255,255,255,0.9)" />
                            <Text className="text-sm font-bold text-white/90">Planifica tu mes</Text>
                        </TouchableOpacity>
                    )}

                    {/* Bottom chips */}
                    <View className="flex-row items-center gap-2 mt-4 flex-wrap">
                        {hasSavingsRate && (
                            <View className="flex-row items-center gap-1 bg-white/12 px-2.5 py-1.5 rounded-lg">
                                <MaterialIcons
                                    name={savingsRate >= 20 ? 'savings' : 'account-balance-wallet'}
                                    size={12}
                                    color={savingsRate >= 20 ? '#6EE7B7' : savingsRate >= 0 ? 'rgba(255,255,255,0.7)' : '#FCA5A5'}
                                />
                                <Text style={{ fontSize: 12, fontWeight: '700', color: savingsRate >= 20 ? '#6EE7B7' : savingsRate >= 0 ? 'rgba(255,255,255,0.7)' : '#FCA5A5' }}>
                                    Ahorro {Math.round(savingsRate)}%
                                </Text>
                            </View>
                        )}

                        {pace && (
                            <View className="flex-row items-center gap-1 bg-white/12 px-2.5 py-1.5 rounded-lg">
                                <MaterialIcons name={pace.icon} size={12} color={pace.color} />
                                <Text style={{ color: pace.color, fontSize: 12, fontWeight: '700' }}>
                                    {pace.text}
                                </Text>
                            </View>
                        )}

                        {income > 0 && (
                            <View className="flex-row items-center gap-1 bg-white/12 px-2.5 py-1.5 rounded-lg">
                                <MaterialIcons name="arrow-upward" size={10} color="#6EE7B7" />
                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#6EE7B7' }}>
                                    +{formatCurrency(income, currency)}
                                </Text>
                            </View>
                        )}

                        {budgetProgress && (
                            <View className="flex-row items-center gap-1 bg-white/12 px-2.5 py-1.5 rounded-lg">
                                <MaterialIcons name="event-note" size={10} color="rgba(255,255,255,0.6)" />
                                <Text style={{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>
                                    {formatCurrency(budgetProgress.planned, currency)} plan
                                </Text>
                            </View>
                        )}
                    </View>
                </LinearGradient>
            </View>
        </TouchableOpacity>
    );
}

const MonthStatusCard = ({
    monthTotalExpense,
    primaryCurrency,
    isAllAccounts,
    budgetProgress,
    savingsRate,
    monthTotalIncome,
    loading,
    refreshing,
    onPlanPress,
    accounts,
    onAccountPress,
    // New: per-account data for carousel
    accountCards,
}) => {
    const daysInMonth = useMemo(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    }, []);

    const [activeCardIndex, setActiveCardIndex] = useState(0);

    const handleScroll = useCallback((e) => {
        const offsetX = e.nativeEvent.contentOffset.x;
        const idx = Math.round(offsetX / (CAROUSEL_CARD_WIDTH + CARD_GAP));
        setActiveCardIndex(Math.max(0, Math.min(idx, (accountCards?.length ?? 1) - 1)));
    }, [accountCards?.length]);

    const renderCarouselItem = useCallback(({ item }) => (
        <AccountCard
            data={item}
            width={CAROUSEL_CARD_WIDTH}
            onPress={onAccountPress}
            onPlanPress={onPlanPress}
            daysInMonth={daysInMonth}
        />
    ), [onAccountPress, onPlanPress, daysInMonth]);

    const cardColors = useMemo(
        () => accountCards?.map(c => c.account.color || '#6366F1') ?? [],
        [accountCards],
    );

    const keyExtractor = useCallback((item) => item.account.id, []);
    const separatorComponent = useCallback(() => <View style={{ width: CARD_GAP }} />, []);

    /* ═══ CAROUSEL MODE ("Todas" with account cards) ═══ */
    if (isAllAccounts && accountCards && accountCards.length > 0) {
        if (loading && !refreshing) {
            return (
                <View style={{ paddingHorizontal: CARD_H_PADDING }}>
                    <View className="rounded-3xl overflow-hidden" style={{ height: 200 }}>
                        <LinearGradient
                            colors={['#6366F1', '#4F46E5', '#4338CA']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' }}
                        >
                            <View className="h-14 w-48 bg-white/10 rounded-2xl" />
                        </LinearGradient>
                    </View>
                </View>
            );
        }

        // Single account with activity: render full-width card (no carousel)
        if (accountCards.length === 1) {
            return (
                <View style={{ paddingHorizontal: CARD_H_PADDING }}>
                    <AccountCard
                        data={accountCards[0]}
                        width={SCREEN_WIDTH - CARD_H_PADDING * 2}
                        onPress={onAccountPress}
                        onPlanPress={onPlanPress}
                        daysInMonth={daysInMonth}
                    />
                </View>
            );
        }

        // Multiple accounts: carousel
        return (
            <View>
                <FlatList
                    horizontal
                    data={accountCards}
                    renderItem={renderCarouselItem}
                    keyExtractor={keyExtractor}
                    ItemSeparatorComponent={separatorComponent}
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={CAROUSEL_CARD_WIDTH + CARD_GAP}
                    decelerationRate="fast"
                    contentContainerStyle={{ paddingHorizontal: CARD_H_PADDING }}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                />
                <DotsIndicator
                    count={accountCards.length}
                    activeIndex={activeCardIndex}
                    colors={cardColors}
                />
            </View>
        );
    }

    /* ═══ SINGLE ACCOUNT MODE (unchanged) ═══ */
    const progressColor = budgetProgress ? budgetBarColor(budgetProgress.percentage) : '#10B981';
    const pace = getPaceIndicator(budgetProgress, daysInMonth);
    const hasSavingsRate = savingsRate !== null && savingsRate !== undefined;

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
                ) : (
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

                {/* Plan CTA when no budget */}
                {!budgetProgress && !loading && (
                    <TouchableOpacity
                        onPress={onPlanPress}
                        className="flex-row items-center gap-2 mt-4 bg-white/15 self-start px-4 py-2.5 rounded-xl"
                    >
                        <MaterialIcons name="pie-chart-outline" size={16} color="rgba(255,255,255,0.9)" />
                        <Text className="text-sm font-bold text-white/90">Planifica tu mes</Text>
                    </TouchableOpacity>
                )}

                {/* Bottom chips */}
                <View className="flex-row items-center gap-2 mt-4 flex-wrap">
                    {hasSavingsRate && (
                        <View className="flex-row items-center gap-1 bg-white/12 px-2.5 py-1.5 rounded-lg">
                            <MaterialIcons
                                name={savingsRate >= 20 ? 'savings' : 'account-balance-wallet'}
                                size={12}
                                color={savingsRate >= 20 ? '#6EE7B7' : savingsRate >= 0 ? 'rgba(255,255,255,0.7)' : '#FCA5A5'}
                            />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: savingsRate >= 20 ? '#6EE7B7' : savingsRate >= 0 ? 'rgba(255,255,255,0.7)' : '#FCA5A5' }}>
                                Ahorro {Math.round(savingsRate)}%
                            </Text>
                        </View>
                    )}

                    {pace && (
                        <View className="flex-row items-center gap-1 bg-white/12 px-2.5 py-1.5 rounded-lg">
                            <MaterialIcons name={pace.icon} size={12} color={pace.color} />
                            <Text style={{ color: pace.color, fontSize: 12, fontWeight: '700' }}>
                                {pace.text}
                            </Text>
                        </View>
                    )}

                    {!loading && monthTotalIncome > 0 && (
                        <View className="flex-row items-center gap-1 bg-white/12 px-2.5 py-1.5 rounded-lg">
                            <MaterialIcons name="arrow-upward" size={10} color="#6EE7B7" />
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#6EE7B7' }}>
                                +{formatCurrency(monthTotalIncome, primaryCurrency)}
                            </Text>
                        </View>
                    )}

                    {budgetProgress && (
                        <View className="flex-row items-center gap-1 bg-white/12 px-2.5 py-1.5 rounded-lg">
                            <MaterialIcons name="event-note" size={10} color="rgba(255,255,255,0.6)" />
                            <Text className="text-xs font-bold text-white/60">
                                {formatCurrency(budgetProgress.planned, primaryCurrency)} plan
                            </Text>
                        </View>
                    )}
                </View>
            </LinearGradient>
        </View>
    );
};

export default MonthStatusCard;
