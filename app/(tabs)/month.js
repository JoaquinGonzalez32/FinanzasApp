import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import TransactionItem from '../../components/TransactionItem';
import ConfirmModal from '../../components/ConfirmModal';
import { SkeletonLoader, useToast, FadeIn, FrostBackground } from '../../components/ui';
import { useAccounts } from '../../src/hooks/useAccounts';
import { getYearTransactions, deleteTransaction } from '../../src/services/transactionsService';
import { onTransactionsChange, emitTransactionsChange } from '../../src/lib/events';
import { formatCurrency, formatTime, getCategoryStyle, sumByType, MONTHS_ES, DAYS_ES } from '../../src/lib/helpers';

export default function MonthScreen() {
    const router = useRouter();
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    const [year, setYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [selectedDay, setSelectedDay] = useState(null);
    const [yearTx, setYearTx] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleteTx, setDeleteTx] = useState(null);
    const [calendarVisible, setCalendarVisible] = useState(false);
    const { show: showToast, ToastComponent } = useToast();

    const { accounts } = useAccounts();

    const [selectedAccountId, setSelectedAccountId] = useState(null);

    useEffect(() => {
        if (accounts.length > 0 && !selectedAccountId) {
            setSelectedAccountId(accounts[0].id);
        }
    }, [accounts]);

    const selectedAccount = accounts.find(a => a.id === selectedAccountId) ?? accounts[0] ?? null;

    const fetchYear = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getYearTransactions(year);
            setYearTx(data);
        } catch (e) {
            if (__DEV__) console.error(e);
        } finally {
            setLoading(false);
        }
    }, [year]);

    useEffect(() => { fetchYear(); }, [fetchYear]);
    useEffect(() => onTransactionsChange(fetchYear), [fetchYear]);

    // Filter transactions for selected month and account
    const monthTx = useMemo(() => {
        const mStr = String(selectedMonth).padStart(2, '0');
        const all = yearTx.filter(t => t.date.startsWith(`${year}-${mStr}`));
        return selectedAccount
            ? all.filter(t => (t.account_id ?? t.category?.account_id) === selectedAccount.id)
            : all;
    }, [yearTx, selectedMonth, year, selectedAccount]);

    const monthIncome = useMemo(() => sumByType(monthTx, 'income'), [monthTx]);
    const monthExpense = useMemo(() => sumByType(monthTx, 'expense'), [monthTx]);

    // Group transactions by day
    const groupedByDay = useMemo(() => {
        const groups = {};
        for (const tx of monthTx) {
            if (!groups[tx.date]) groups[tx.date] = [];
            groups[tx.date].push(tx);
        }
        return Object.entries(groups)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, txs]) => ({
                date,
                transactions: txs,
                expense: sumByType(txs, 'expense'),
                income: sumByType(txs, 'income'),
            }));
    }, [monthTx]);

    // Calendar data
    const firstDayOfWeek = new Date(year, selectedMonth - 1, 1).getDay();
    const daysInMonth = new Date(year, selectedMonth, 0).getDate();
    const daysInPrevMonth = new Date(year, selectedMonth - 1, 0).getDate();

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

    // Day label helper
    const getDayLabel = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (dateStr === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`) {
            return 'Hoy';
        }
        if (dateStr === `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`) {
            return 'Ayer';
        }
        return `${DAYS_ES[d.getDay()]} ${d.getDate()}`;
    };

    const handleEditTx = (tx) => {
        router.push({
            pathname: '/add-transaction',
            params: {
                type: tx.type,
                editId: tx.id,
                editAmount: String(tx.amount),
                editCategoryId: tx.category_id || '',
                editAccountId: tx.account_id || '',
                editNote: tx.note || '',
                editDate: tx.date,
            },
        });
    };

    const confirmDelete = async () => {
        if (!deleteTx) return;
        const txToDelete = deleteTx;
        setDeleteTx(null);
        try {
            await deleteTransaction(txToDelete.id);
            emitTransactionsChange();
            showToast({ type: 'success', message: `"${txToDelete.category?.name ?? 'Transaccion'}" eliminada` });
        } catch (e) {
            showToast({ type: 'error', message: 'Error al eliminar' });
        }
    };

    const goMonth = (delta) => {
        let m = selectedMonth + delta;
        let y = year;
        if (m < 1) { m = 12; y--; }
        if (m > 12) { m = 1; y++; }
        if (y > currentYear || (y === currentYear && m > currentMonth)) return;
        setYear(y);
        setSelectedMonth(m);
        setSelectedDay(null);
    };

    const selectCalendarDay = (day) => {
        setSelectedDay(day);
        setCalendarVisible(false);
    };

    // Filter by selected day
    const displayGroups = useMemo(() => {
        if (!selectedDay) return groupedByDay;
        const dateStr = `${year}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
        return groupedByDay.filter(g => g.date === dateStr);
    }, [groupedByDay, selectedDay, year, selectedMonth]);

    return (
        <FrostBackground edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
                <Text className="text-xl font-bold text-stone-900 dark:text-white">Movimientos</Text>
                <View className="flex-row items-center gap-2">
                    {/* Account filter */}
                    {accounts.length > 1 && selectedAccount && (
                        <TouchableOpacity
                            onPress={() => {
                                const idx = accounts.findIndex(a => a.id === selectedAccountId);
                                const nextIdx = (idx + 1) % accounts.length;
                                setSelectedAccountId(accounts[nextIdx].id);
                            }}
                            className="flex-row items-center gap-1.5 bg-frost dark:bg-slate-800 px-2.5 py-1.5 rounded-lg"
                        >
                            <MaterialIcons name={selectedAccount.icon || 'account-balance-wallet'} size={12} color="#64748b" />
                            <Text className="text-xs font-bold text-stone-500">{selectedAccount.name}</Text>
                            <MaterialIcons name="swap-horiz" size={12} color="#a8a29e" />
                        </TouchableOpacity>
                    )}
                    {/* Calendar toggle */}
                    <TouchableOpacity
                        onPress={() => setCalendarVisible(true)}
                        className="h-9 w-9 items-center justify-center rounded-full bg-frost dark:bg-slate-800"
                    >
                        <MaterialIcons name="calendar-today" size={16} color="#64748b" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Month navigator */}
            <View className="flex-row items-center justify-between px-5 pb-3">
                <TouchableOpacity onPress={() => goMonth(-1)} className="h-8 w-8 items-center justify-center rounded-full bg-frost dark:bg-slate-800">
                    <MaterialIcons name="chevron-left" size={20} color="#64748b" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setSelectedDay(null); }} className="flex-row items-center gap-2">
                    <Text className="text-sm font-bold text-stone-800 dark:text-white">
                        {MONTHS_ES[selectedMonth - 1]} {year}
                    </Text>
                    {selectedDay && (
                        <View className="bg-primary/10 px-2 py-0.5 rounded-full">
                            <Text className="text-xs font-bold text-primary">Dia {selectedDay}</Text>
                        </View>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => goMonth(1)}
                    disabled={year === currentYear && selectedMonth >= currentMonth}
                    className="h-8 w-8 items-center justify-center rounded-full bg-frost dark:bg-slate-800"
                >
                    <MaterialIcons name="chevron-right" size={20} color={year === currentYear && selectedMonth >= currentMonth ? '#d6d3d1' : '#64748b'} />
                </TouchableOpacity>
            </View>

            {/* Month summary */}
            {!loading && monthTx.length > 0 && (
                <View className="mx-5 mb-4 gap-2.5">
                    {/* Balance card */}
                    <View className="rounded-2xl overflow-hidden shadow-md">
                        <LinearGradient
                            colors={['#0f172a', '#1e3a5f', '#0f172a']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            className="px-5 py-5"
                        >
                            {/* Decorative circles */}
                            <View className="absolute -top-6 -right-6 w-24 h-24 rounded-full" style={{ backgroundColor: 'rgba(19,127,236,0.15)' }} />
                            <View className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full" style={{ backgroundColor: 'rgba(16,185,129,0.1)' }} />

                            <Text className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Balance del mes</Text>
                            <Text className="text-2xl font-extrabold text-white">
                                {monthIncome - monthExpense >= 0 ? '+' : ''}{formatCurrency(monthIncome - monthExpense, selectedAccount?.currency)}
                            </Text>
                        </LinearGradient>
                    </View>

                    {/* Income / Expense row */}
                    <View className="flex-row gap-2.5">
                        <View className="flex-1 flex-row items-center gap-2.5 bg-white/75 dark:bg-slate-900/50 rounded-xl border border-white/60 dark:border-slate-800/60 px-3.5 py-2.5">
                            <View className="h-7 w-7 rounded-full bg-emerald-500/10 items-center justify-center">
                                <MaterialIcons name="arrow-upward" size={14} color="#10b981" />
                            </View>
                            <View>
                                <Text className="text-[10px] text-stone-400 dark:text-slate-500">Ingresos</Text>
                                <Text className="text-xs font-bold text-stone-800 dark:text-white">{formatCurrency(monthIncome, selectedAccount?.currency)}</Text>
                            </View>
                        </View>
                        <View className="flex-1 flex-row items-center gap-2.5 bg-white/75 dark:bg-slate-900/50 rounded-xl border border-white/60 dark:border-slate-800/60 px-3.5 py-2.5">
                            <View className="h-7 w-7 rounded-full bg-red-500/10 items-center justify-center">
                                <MaterialIcons name="arrow-downward" size={14} color="#ef4444" />
                            </View>
                            <View>
                                <Text className="text-[10px] text-stone-400 dark:text-slate-500">Gastos</Text>
                                <Text className="text-xs font-bold text-stone-800 dark:text-white">{formatCurrency(monthExpense, selectedAccount?.currency)}</Text>
                            </View>
                        </View>
                    </View>
                </View>
            )}

            {/* Transaction list grouped by day */}
            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
                {loading && (
                    <View className="px-5 gap-3 pt-2">
                        <SkeletonLoader.List count={6} />
                    </View>
                )}

                {!loading && displayGroups.length === 0 && (
                    <View className="items-center py-16">
                        <View className="h-14 w-14 rounded-2xl bg-frost dark:bg-input-dark items-center justify-center mb-3">
                            <MaterialIcons name="receipt-long" size={24} color="#d6d3d1" />
                        </View>
                        <Text className="text-stone-400 text-sm font-medium">Sin movimientos</Text>
                        {selectedDay && (
                            <TouchableOpacity onPress={() => setSelectedDay(null)} className="mt-2">
                                <Text className="text-primary text-xs font-bold">Ver todo el mes</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {!loading && displayGroups.map((group, gi) => (
                    <FadeIn key={group.date} delay={gi * 60}>
                        <View className="mx-5 mb-3">
                            {/* Day header */}
                            <View className="flex-row items-center justify-between py-2">
                                <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">
                                    {getDayLabel(group.date)}
                                </Text>
                                <Text className="text-xs font-medium text-stone-400 dark:text-slate-500">
                                    {group.transactions.length} mov.
                                </Text>
                            </View>

                            {/* Transactions card */}
                            <View className="bg-white/75 dark:bg-slate-900/50 rounded-2xl border border-white/60 dark:border-slate-800/60 shadow-sm overflow-hidden">
                                {group.transactions.map((tx, ti) => {
                                    const style = getCategoryStyle(tx.category?.color);
                                    return (
                                        <View key={tx.id}>
                                            {ti > 0 && <View className="h-px bg-stone-100 dark:bg-slate-800/60 ml-14" />}
                                            <TransactionItem
                                                icon={tx.category?.icon ?? "payments"}
                                                label={tx.category?.name ?? "Sin categoria"}
                                                sub={tx.note || formatTime(tx.created_at)}
                                                amount={`${tx.type === 'income' ? '+' : '-'} ${formatCurrency(tx.amount, selectedAccount?.currency)}`}
                                                colorClass={tx.type === 'income' ? 'text-emerald-500' : 'text-stone-800 dark:text-white'}
                                                iconBg={style.bg}
                                                iconColor={style.hex}
                                                onPress={() => handleEditTx(tx)}
                                                onLongPress={() => setDeleteTx(tx)}
                                            />
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    </FadeIn>
                ))}
            </ScrollView>

            {/* Calendar Sheet */}
            <Modal visible={calendarVisible} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-background-light dark:bg-modal-dark rounded-t-3xl">
                        <View className="items-center pt-3 pb-1">
                            <View className="h-1 w-10 rounded-full bg-stone-300 dark:bg-slate-600" />
                        </View>
                        <View className="flex-row items-center justify-between px-5 pt-3 pb-4">
                            <Text className="text-lg font-bold text-stone-900 dark:text-white">
                                {MONTHS_ES[selectedMonth - 1]} {year}
                            </Text>
                            <View className="flex-row items-center gap-2">
                                {selectedDay && (
                                    <TouchableOpacity
                                        onPress={() => { setSelectedDay(null); setCalendarVisible(false); }}
                                        className="px-3 py-1.5 rounded-lg bg-frost dark:bg-slate-800"
                                    >
                                        <Text className="text-xs font-bold text-stone-500">Ver todo</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    onPress={() => setCalendarVisible(false)}
                                    className="h-8 w-8 items-center justify-center rounded-full bg-frost dark:bg-slate-800"
                                >
                                    <MaterialIcons name="close" size={20} color="#64748b" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View className="px-5 pb-8">
                            {/* Day headers */}
                            <View className="flex-row justify-between mb-2">
                                {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map(day => (
                                    <Text key={day} className="w-11 text-center text-xs font-semibold text-stone-400 uppercase">{day}</Text>
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
                                    const isToday = year === currentYear && selectedMonth === currentMonth && d === currentDay;
                                    return (
                                        <TouchableOpacity key={d} onPress={() => selectCalendarDay(d)} className="w-11 h-11 items-center justify-center">
                                            {isSelected && <View className="absolute inset-0 bg-primary rounded-xl" />}
                                            {!isSelected && isToday && <View className="absolute inset-0 border-2 border-primary/30 rounded-xl" />}
                                            <Text className={`text-sm ${isSelected ? 'font-bold text-white' : isToday ? 'font-bold text-primary' : 'dark:text-white'}`}>{d}</Text>
                                            {hasTx && <View className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'} mt-0.5`} />}
                                        </TouchableOpacity>
                                    );
                                })}

                                {Array.from({ length: padCells }, (_, i) => (
                                    <View key={`pad-${i}`} className="w-11 h-11" />
                                ))}
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>

            <ConfirmModal
                visible={!!deleteTx}
                title="Eliminar transaccion"
                message={deleteTx ? `Eliminar "${deleteTx.category?.name ?? 'Sin categoria'}" por ${formatCurrency(deleteTx.amount, selectedAccount?.currency)}?` : ''}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTx(null)}
            />
            {ToastComponent}
        </FrostBackground>
    );
}
