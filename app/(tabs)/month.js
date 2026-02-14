import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useMemo } from 'react';
import TransactionItem from '../../components/TransactionItem';
import { useTransactions } from '../../src/hooks/useTransactions';
import { formatAmount, formatCurrency, formatTime, getCategoryStyle, sumByType, MONTHS_ES, DAYS_ES } from '../../src/lib/helpers';

export default function MonthScreen() {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [selectedDay, setSelectedDay] = useState(now.getDate());

    const { transactions: monthTx, loading } = useTransactions({ mode: 'month', year, month });

    // Calendar grid computation
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

    const prevDays = [];
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        prevDays.push(daysInPrevMonth - i);
    }
    const currentDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const totalCells = prevDays.length + currentDays.length;
    const padCells = (7 - (totalCells % 7)) % 7;

    const daysWithTx = useMemo(() => {
        const set = new Set();
        monthTx.forEach(t => {
            const d = new Date(t.date + 'T00:00:00').getDate();
            set.add(d);
        });
        return set;
    }, [monthTx]);

    // Selected day data
    const selectedDateStr = `${year}-${String(month).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
    const dayTx = useMemo(() => monthTx.filter(t => t.date === selectedDateStr), [monthTx, selectedDateStr]);
    const dayExpense = useMemo(() => sumByType(dayTx, 'expense'), [dayTx]);
    const dayOfWeek = new Date(year, month - 1, selectedDay).getDay();
    const dayLabel = `${DAYS_ES[dayOfWeek]}, ${selectedDay} de ${MONTHS_ES[month - 1]}`;

    const prevMonth = () => {
        if (month === 1) { setMonth(12); setYear(y => y - 1); }
        else setMonth(m => m - 1);
        setSelectedDay(1);
    };
    const nextMonth = () => {
        if (month === 12) { setMonth(1); setYear(y => y + 1); }
        else setMonth(m => m + 1);
        setSelectedDay(1);
    };

    return (
        <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
            <View className="flex-row items-center justify-between p-4 bg-background-light/80 dark:bg-background-dark/80">
                <TouchableOpacity className="p-2 rounded-full active:bg-slate-200 dark:active:bg-slate-800"><MaterialIcons name="menu" size={24} color="#64748b" /></TouchableOpacity>
                <Text className="text-lg font-bold text-slate-900 dark:text-white">Diario y Calendario</Text>
                <TouchableOpacity className="p-2 rounded-full active:bg-slate-200 dark:active:bg-slate-800"><MaterialIcons name="search" size={24} color="#64748b" /></TouchableOpacity>
            </View>

            <View className="flex-1">
                <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                    {/* Calendar */}
                    <View className="px-4 pb-6 border-b border-slate-200 dark:border-slate-800">
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-base font-bold text-primary">{MONTHS_ES[month - 1]} {year}</Text>
                            <View className="flex-row gap-2">
                                <TouchableOpacity onPress={prevMonth} className="p-1"><MaterialIcons name="chevron-left" size={24} color="#94a3b8" /></TouchableOpacity>
                                <TouchableOpacity onPress={nextMonth} className="p-1"><MaterialIcons name="chevron-right" size={24} color="#94a3b8" /></TouchableOpacity>
                            </View>
                        </View>

                        {/* Days Header */}
                        <View className="flex-row justify-between mb-2">
                            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                                <Text key={day} className="w-10 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">{day}</Text>
                            ))}
                        </View>

                        {/* Calendar Grid */}
                        <View className="flex-row flex-wrap justify-between">
                            {prevDays.map(d => (
                                <View key={`prev-${d}`} className="w-10 h-10 items-center justify-center opacity-30">
                                    <Text className="text-sm dark:text-white">{d}</Text>
                                </View>
                            ))}

                            {currentDays.map(d => {
                                const isSelected = d === selectedDay;
                                const hasTx = daysWithTx.has(d);
                                return (
                                    <TouchableOpacity key={d} onPress={() => setSelectedDay(d)} className="w-10 h-10 items-center justify-center">
                                        {isSelected && <View className="absolute inset-0 bg-primary rounded-lg" />}
                                        <Text className={`text-sm ${isSelected ? 'font-bold text-white' : 'dark:text-white'}`}>{d}</Text>
                                        {hasTx && <View className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'} mt-0.5`} />}
                                    </TouchableOpacity>
                                );
                            })}

                            {Array.from({ length: padCells }, (_, i) => (
                                <View key={`pad-${i}`} className="w-10 h-10" />
                            ))}
                        </View>
                    </View>

                    {/* Daily Summary */}
                    <View className="flex-1 bg-white dark:bg-slate-900/40 rounded-t-3xl mt-4 px-4 pt-6 min-h-[400px]">
                        <View className="flex-row items-center justify-between mb-6">
                            <View>
                                <Text className="text-sm font-bold text-slate-400 uppercase tracking-wide">{dayLabel}</Text>
                                <Text className="text-xl font-bold dark:text-white">Resumen del día</Text>
                            </View>
                            <View className="items-end">
                                <Text className="text-sm font-medium text-slate-400">Total gasto</Text>
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
            </View>
        </SafeAreaView>
    );
}
