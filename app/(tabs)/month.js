import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useMemo, useEffect, useCallback } from 'react';
import TransactionItem from '../../components/TransactionItem';
import { useAccounts } from '../../src/hooks/useAccounts';
import { getYearTransactions } from '../../src/services/transactionsService';
import { onTransactionsChange } from '../../src/lib/events';
import { formatAmount, formatCurrency, formatTime, getCategoryStyle, sumByType, MONTHS_ES, DAYS_ES } from '../../src/lib/helpers';

export default function MonthScreen() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const [year, setYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedDay, setSelectedDay] = useState(1);
    const [yearTx, setYearTx] = useState([]);
    const [loading, setLoading] = useState(true);

    const { accounts } = useAccounts();
    const primaryAccount = accounts.length > 0 ? accounts[0] : null;

    const fetchYear = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getYearTransactions(year);
            setYearTx(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [year]);

    useEffect(() => { fetchYear(); }, [fetchYear]);
    useEffect(() => onTransactionsChange(fetchYear), [fetchYear]);

    // -- Overview data --
    const monthSummaries = useMemo(() => {
        const maxMonth = year === currentYear ? currentMonth : 12;
        const summaries = [];
        for (let m = maxMonth; m >= 1; m--) {
            const mStr = String(m).padStart(2, '0');
            const prefix = `${year}-${mStr}`;
            const mTx = yearTx.filter(t => t.date.startsWith(prefix));
            const accountTx = primaryAccount
                ? mTx.filter(t => (t.account_id ?? t.category?.account_id) === primaryAccount.id)
                : mTx;
            summaries.push({
                month: m,
                income: sumByType(accountTx, 'income'),
                expense: sumByType(accountTx, 'expense'),
                txCount: mTx.length,
            });
        }
        return summaries;
    }, [yearTx, year, primaryAccount, currentYear, currentMonth]);

    // -- Detail view data --
    const monthTx = useMemo(() => {
        if (!selectedMonth) return [];
        const mStr = String(selectedMonth).padStart(2, '0');
        return yearTx.filter(t => t.date.startsWith(`${year}-${mStr}`));
    }, [yearTx, selectedMonth, year]);

    const firstDayOfWeek = selectedMonth ? new Date(year, selectedMonth - 1, 1).getDay() : 0;
    const daysInMonth = selectedMonth ? new Date(year, selectedMonth, 0).getDate() : 0;
    const daysInPrevMonth = selectedMonth ? new Date(year, selectedMonth - 1, 0).getDate() : 0;

    const prevDays = useMemo(() => {
        const arr = [];
        for (let i = firstDayOfWeek - 1; i >= 0; i--) arr.push(daysInPrevMonth - i);
        return arr;
    }, [firstDayOfWeek, daysInPrevMonth]);

    const currentDays = useMemo(
        () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
        [daysInMonth]
    );

    const padCells = (7 - ((prevDays.length + currentDays.length) % 7)) % 7;

    const daysWithTx = useMemo(() => {
        const set = new Set();
        monthTx.forEach(t => {
            const d = new Date(t.date + 'T00:00:00').getDate();
            set.add(d);
        });
        return set;
    }, [monthTx]);

    const selectedDateStr = selectedMonth
        ? `${year}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
        : '';
    const dayTx = useMemo(() => monthTx.filter(t => t.date === selectedDateStr), [monthTx, selectedDateStr]);
    const dayExpense = useMemo(() => sumByType(dayTx, 'expense'), [dayTx]);
    const dayIncome = useMemo(() => sumByType(dayTx, 'income'), [dayTx]);
    const dayOfWeek = selectedMonth ? new Date(year, selectedMonth - 1, selectedDay).getDay() : 0;
    const dayLabel = selectedMonth ? `${DAYS_ES[dayOfWeek]}, ${selectedDay} de ${MONTHS_ES[selectedMonth - 1]}` : '';

    const openMonth = (m) => {
        setSelectedMonth(m);
        if (year === currentYear && m === currentMonth) {
            setSelectedDay(now.getDate());
        } else {
            setSelectedDay(1);
        }
    };

    const prevYear = () => { setYear(y => y - 1); setSelectedMonth(null); };
    const nextYear = () => {
        if (year < currentYear) { setYear(y => y + 1); setSelectedMonth(null); }
    };

    // ========== OVERVIEW ==========
    if (!selectedMonth) {
        return (
            <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
                <View className="flex-row items-center justify-between px-5 py-3">
                    <View className="flex-row items-center gap-3">
                        <View className="p-2 bg-primary/10 rounded-xl">
                            <MaterialIcons name="calendar-month" size={24} color="#137fec" />
                        </View>
                        <Text className="text-xl font-bold text-slate-900 dark:text-white">Actividad</Text>
                    </View>
                    {primaryAccount && (
                        <View className="flex-row items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                            <MaterialIcons name={primaryAccount.icon || 'account-balance-wallet'} size={14} color="#64748b" />
                            <Text className="text-xs font-bold text-slate-500">{primaryAccount.name}</Text>
                        </View>
                    )}
                </View>

                {/* Year selector */}
                <View className="flex-row items-center justify-center gap-4 pb-3">
                    <TouchableOpacity onPress={prevYear} className="p-2">
                        <MaterialIcons name="chevron-left" size={24} color="#94a3b8" />
                    </TouchableOpacity>
                    <Text className="text-lg font-extrabold text-slate-900 dark:text-white">{year}</Text>
                    <TouchableOpacity onPress={nextYear} className="p-2" disabled={year >= currentYear}>
                        <MaterialIcons name="chevron-right" size={24} color={year >= currentYear ? '#cbd5e1' : '#94a3b8'} />
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#137fec" />
                    </View>
                ) : (
                    <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingBottom: 100 }}>
                        {monthSummaries.map(({ month: m, income, expense, txCount }) => {
                            const isCurrent = year === currentYear && m === currentMonth;
                            const hasData = txCount > 0;
                            return (
                                <TouchableOpacity
                                    key={m}
                                    onPress={() => openMonth(m)}
                                    activeOpacity={0.7}
                                    className={`p-5 rounded-2xl border mb-3 ${isCurrent ? 'bg-primary/5 dark:bg-primary/10 border-primary/20' : 'bg-white dark:bg-card-dark border-slate-200 dark:border-slate-800'}`}
                                >
                                    <View className="flex-row items-center justify-between mb-3">
                                        <View className="flex-row items-center gap-2">
                                            <Text className={`text-base font-bold ${isCurrent ? 'text-primary' : 'text-slate-900 dark:text-white'}`}>
                                                {MONTHS_ES[m - 1]}
                                            </Text>
                                            {isCurrent && (
                                                <View className="bg-primary/20 px-2 py-0.5 rounded-full">
                                                    <Text className="text-[10px] font-bold text-primary">Actual</Text>
                                                </View>
                                            )}
                                        </View>
                                        <MaterialIcons name="chevron-right" size={20} color={isCurrent ? '#137fec' : '#94a3b8'} />
                                    </View>
                                    {hasData ? (
                                        <View className="flex-row gap-6">
                                            <View className="flex-row items-center gap-1.5">
                                                <View className="h-5 w-5 rounded-md bg-emerald-500/10 items-center justify-center">
                                                    <MaterialIcons name="arrow-downward" size={12} color="#10b981" />
                                                </View>
                                                <Text className="text-sm font-bold text-emerald-500">{formatCurrency(income)}</Text>
                                            </View>
                                            <View className="flex-row items-center gap-1.5">
                                                <View className="h-5 w-5 rounded-md bg-rose-500/10 items-center justify-center">
                                                    <MaterialIcons name="arrow-upward" size={12} color="#f43f5e" />
                                                </View>
                                                <Text className="text-sm font-bold text-rose-500">{formatCurrency(expense)}</Text>
                                            </View>
                                        </View>
                                    ) : (
                                        <Text className="text-sm text-slate-400">Sin movimientos</Text>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                )}
            </SafeAreaView>
        );
    }

    // ========== DETAIL (Calendar + Day) ==========
    return (
        <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
            <View className="flex-row items-center justify-between px-5 py-3">
                <TouchableOpacity onPress={() => setSelectedMonth(null)} className="h-10 w-10 items-center justify-center rounded-full active:bg-slate-200 dark:active:bg-slate-800">
                    <MaterialIcons name="arrow-back-ios-new" size={20} color="#475569" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-slate-900 dark:text-white">{MONTHS_ES[selectedMonth - 1]} {year}</Text>
                <View className="w-10" />
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Calendar */}
                <View className="px-5 pb-6 border-b border-slate-200 dark:border-slate-800">
                    <View className="flex-row justify-between mb-2">
                        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                            <Text key={day} className="w-11 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">{day}</Text>
                        ))}
                    </View>

                    <View className="flex-row flex-wrap justify-between">
                        {prevDays.map(d => (
                            <View key={`prev-${d}`} className="w-11 h-11 items-center justify-center opacity-30">
                                <Text className="text-sm dark:text-white">{d}</Text>
                            </View>
                        ))}

                        {currentDays.map(d => {
                            const isSelected = d === selectedDay;
                            const hasTx = daysWithTx.has(d);
                            return (
                                <TouchableOpacity key={d} onPress={() => setSelectedDay(d)} className="w-11 h-11 items-center justify-center">
                                    {isSelected && <View className="absolute inset-0 bg-primary rounded-lg" />}
                                    <Text className={`text-sm ${isSelected ? 'font-bold text-white' : 'dark:text-white'}`}>{d}</Text>
                                    {hasTx && <View className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'} mt-0.5`} />}
                                </TouchableOpacity>
                            );
                        })}

                        {Array.from({ length: padCells }, (_, i) => (
                            <View key={`pad-${i}`} className="w-11 h-11" />
                        ))}
                    </View>
                </View>

                {/* Daily Summary */}
                <View className="flex-1 bg-white dark:bg-slate-900/40 rounded-t-3xl mt-4 px-5 pt-6 min-h-[400px]">
                    <View className="flex-row items-center justify-between mb-6">
                        <View>
                            <Text className="text-sm font-bold text-slate-400 uppercase tracking-wide">{dayLabel}</Text>
                            <Text className="text-xl font-bold dark:text-white">Resumen del día</Text>
                        </View>
                        <View className="items-end">
                            {dayIncome > 0 && (
                                <Text className="text-sm font-bold text-emerald-500">+{formatCurrency(dayIncome)}</Text>
                            )}
                            <Text className="text-xl font-bold text-red-500">-{formatCurrency(dayExpense)}</Text>
                        </View>
                    </View>

                    {loading && <ActivityIndicator color="#137fec" style={{ marginVertical: 20 }} />}

                    {!loading && dayTx.length === 0 && (
                        <Text className="text-slate-400 text-sm text-center py-8">Sin movimientos este día</Text>
                    )}

                    <View>
                        {dayTx.map(tx => {
                            const style = getCategoryStyle(tx.category?.color);
                            return (
                                <TransactionItem
                                    key={tx.id}
                                    icon={tx.category?.icon ?? "payments"}
                                    label={tx.category?.name ?? "Sin categoría"}
                                    sub={tx.note ? `${tx.note} • ${formatTime(tx.created_at)}` : formatTime(tx.created_at)}
                                    amount={formatAmount(tx.amount, tx.type)}
                                    colorClass={tx.type === 'income' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}
                                    iconBg={style.bg}
                                    iconColor={style.hex}
                                />
                            );
                        })}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
