/**
 * TRANSACTIONS SCREEN — "En que gaste?"
 *
 * LAYOUT:
 * ┌──────────────────────────────┐
 * │  Header: "Movimientos" · Calendar │
 * │  Month nav: < Marzo 2026 >        │
 * │  Account chips (cycle button)     │
 * ├──────────────────────────────┤
 * │  Month summary: Income · Expense  │
 * ├──────────────────────────────┤
 * │  DAY GROUPS                       │
 * │  ┌ Hoy ────── 3 mov · $U520 ──┐  │
 * │  │  Comida  -$U170            │  │
 * │  │  Comida  -$U350 (bold)     │  │
 * │  └────────────────────────────┘  │
 * │  ┌ Ayer ────── 2 mov · $U200 ──┐ │
 * │  │  ...                         │ │
 * │  └──────────────────────────────┘ │
 * └──────────────────────────────┘
 *
 * KEY CHANGES:
 * - No "Balance del mes" dark gradient card (that's Home's job)
 * - Day subtotals shown in each group header
 * - Compact income/expense summary row (not duplicate of Home)
 * - Amount magnitude differentiation via TransactionRow
 */
import { View, Text, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import TransactionRow from '../../components/ui/TransactionRow';
import ConfirmModal from '../../components/ConfirmModal';
import { SkeletonLoader, useToast, FadeIn, FrostBackground, EmptyState } from '../../components/ui';
import { getYearTransactions, deleteTransaction } from '../../src/services/transactionsService';
import { friendlyMessage } from '../../src/lib/friendlyError';
import { onTransactionsChange, emitTransactionsChange } from '../../src/lib/events';
import { formatCurrency, sumByType, MONTHS_ES, DAYS_ES, monthLabel, getCategoryStyle } from '../../src/lib/helpers';
import { useAccountContext } from '../../src/context/AccountContext';
import AccountSwitcher from '../../src/components/AccountSwitcher';

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

    const { selectedAccountId, selectedAccount, accounts, isAllAccounts } = useAccountContext();

    const accMap = useMemo(() => {
        const m = {};
        accounts.forEach(a => { m[a.id] = a; });
        return m;
    }, [accounts]);

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

    const monthTx = useMemo(() => {
        const mStr = String(selectedMonth).padStart(2, '0');
        const all = yearTx.filter(t => t.date.startsWith(`${year}-${mStr}`));
        if (!selectedAccountId) return all;
        return all.filter(t => (t.account_id ?? t.category?.account_id) === selectedAccountId);
    }, [yearTx, selectedMonth, year, selectedAccountId]);

    const monthIncome = useMemo(() => sumByType(monthTx, 'income'), [monthTx]);
    const monthExpense = useMemo(() => sumByType(monthTx, 'expense'), [monthTx]);

    // Per-account totals for "Todas" mode
    const incomeByAccount = useMemo(() => {
        if (!isAllAccounts) return null;
        const map = {};
        for (const tx of monthTx) {
            if (tx.type !== 'income') continue;
            const accId = tx.account_id ?? tx.category?.account_id;
            if (!accId || !accMap[accId]) continue;
            if (!map[accId]) map[accId] = 0;
            map[accId] += Number(tx.amount);
        }
        const entries = Object.entries(map).map(([id, total]) => ({
            id, total, name: accMap[id]?.name, color: accMap[id]?.color, currency: accMap[id]?.currency ?? 'UYU',
        }));
        return entries.length > 0 ? entries : null;
    }, [monthTx, isAllAccounts, accMap]);

    const expenseByAccount = useMemo(() => {
        if (!isAllAccounts) return null;
        const map = {};
        for (const tx of monthTx) {
            if (tx.type !== 'expense') continue;
            const accId = tx.account_id ?? tx.category?.account_id;
            if (!accId || !accMap[accId]) continue;
            if (!map[accId]) map[accId] = 0;
            map[accId] += Number(tx.amount);
        }
        const entries = Object.entries(map).map(([id, total]) => ({
            id, total, name: accMap[id]?.name, color: accMap[id]?.color, currency: accMap[id]?.currency ?? 'UYU',
        }));
        return entries.length > 0 ? entries : null;
    }, [monthTx, isAllAccounts, accMap]);

    // Group transactions by day with subtotals
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
                total: sumByType(txs, 'expense') + sumByType(txs, 'income'),
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

    const getDayLabel = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const fmt = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        if (dateStr === fmt(today)) return 'Hoy';
        if (dateStr === fmt(yesterday)) return 'Ayer';
        return `${DAYS_ES[d.getDay()]} ${d.getDate()}`;
    };

    const handleEditTx = (tx) => {
        router.push({
            pathname: '/add-transaction',
            params: {
                type: tx.type, editId: tx.id, editAmount: String(tx.amount),
                editCategoryId: tx.category_id || '', editAccountId: tx.account_id || '',
                editNote: tx.note || '', editDate: tx.date,
                editBudgetMonth: tx.budget_month || '',
            },
        });
    };

    const getBudgetMonthLabel = (tx) => {
        if (tx.type !== 'income' || !tx.budget_month) return undefined;
        if (tx.budget_month === tx.date.substring(0, 7)) return undefined;
        return `→ ${monthLabel(tx.budget_month)}`;
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
            showToast({ type: 'error', message: friendlyMessage(e) });
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

    const displayGroups = useMemo(() => {
        if (!selectedDay) return groupedByDay;
        const dateStr = `${year}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
        return groupedByDay.filter(g => g.date === dateStr);
    }, [groupedByDay, selectedDay, year, selectedMonth]);

    return (
        <FrostBackground edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 pt-2 pb-3">
                <Text className="text-xl font-bold text-slate-900 dark:text-white">Movimientos</Text>
                <View className="flex-row items-center gap-2">
                    <AccountSwitcher />
                    <TouchableOpacity
                        onPress={() => setCalendarVisible(true)}
                        className="h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
                    >
                        <MaterialIcons name="calendar-today" size={16} color="#64748b" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Month navigator */}
            <View className="flex-row items-center justify-between px-5 pb-3">
                <TouchableOpacity onPress={() => goMonth(-1)} className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <MaterialIcons name="chevron-left" size={20} color="#64748b" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setSelectedDay(null); }} className="flex-row items-center gap-2">
                    <Text className="text-sm font-bold text-slate-800 dark:text-white">
                        {MONTHS_ES[selectedMonth - 1]} {year}
                    </Text>
                    {selectedDay && (
                        <View className="bg-primary-faint dark:bg-primary/10 px-2 py-0.5 rounded-full">
                            <Text className="text-xs font-bold text-primary">Dia {selectedDay}</Text>
                        </View>
                    )}
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => goMonth(1)}
                    disabled={year === currentYear && selectedMonth >= currentMonth}
                    className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
                >
                    <MaterialIcons name="chevron-right" size={20} color={year === currentYear && selectedMonth >= currentMonth ? '#CBD5E1' : '#64748b'} />
                </TouchableOpacity>
            </View>

            {/* Compact month summary */}
            {!loading && monthTx.length > 0 && (
                <FadeIn delay={100}>
                    {isAllAccounts && (incomeByAccount || expenseByAccount) ? (
                        /* Per-account breakdown in "Todas" mode */
                        <View className="mx-5 mb-4 bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-3">
                            {incomeByAccount && (
                                <View className={expenseByAccount ? 'mb-3 pb-3 border-b border-slate-100 dark:border-slate-800' : ''}>
                                    <Text className="text-2xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mb-1.5">Ingresos</Text>
                                    {incomeByAccount.map((a) => (
                                        <View key={a.id} className="flex-row items-center gap-2 mb-1">
                                            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: getCategoryStyle(a.color).hex }} />
                                            <Text className="text-xs text-slate-500 dark:text-slate-400 flex-1" numberOfLines={1}>{a.name}</Text>
                                            <Text className="text-xs font-bold text-emerald-500">+{formatCurrency(a.total, a.currency)}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                            {expenseByAccount && (
                                <View>
                                    <Text className="text-2xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mb-1.5">Gastos</Text>
                                    {expenseByAccount.map((a) => (
                                        <View key={a.id} className="flex-row items-center gap-2 mb-1">
                                            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: getCategoryStyle(a.color).hex }} />
                                            <Text className="text-xs text-slate-500 dark:text-slate-400 flex-1" numberOfLines={1}>{a.name}</Text>
                                            <Text className="text-xs font-bold text-red-500">-{formatCurrency(a.total, a.currency)}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    ) : (
                        /* Single-account or single-currency summary */
                        <View className="flex-row gap-2.5 mx-5 mb-4">
                            <View className="flex-1 bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5">
                                <View className="flex-row items-center gap-2.5">
                                    <View className="h-7 w-7 rounded-full bg-emerald-50 dark:bg-emerald-500/10 items-center justify-center">
                                        <MaterialIcons name="arrow-upward" size={14} color="#10b981" />
                                    </View>
                                    <View>
                                        <Text className="text-2xs text-slate-400 dark:text-slate-500">Ingresos</Text>
                                        <Text className="text-xs font-bold text-slate-800 dark:text-white">{formatCurrency(monthIncome, selectedAccount?.currency)}</Text>
                                    </View>
                                </View>
                            </View>
                            <View className="flex-1 bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5">
                                <View className="flex-row items-center gap-2.5">
                                    <View className="h-7 w-7 rounded-full bg-red-50 dark:bg-red-500/10 items-center justify-center">
                                        <MaterialIcons name="arrow-downward" size={14} color="#ef4444" />
                                    </View>
                                    <View>
                                        <Text className="text-2xs text-slate-400 dark:text-slate-500">Gastos</Text>
                                        <Text className="text-xs font-bold text-slate-800 dark:text-white">{formatCurrency(monthExpense, selectedAccount?.currency)}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}
                </FadeIn>
            )}

            {/* Transaction list grouped by day */}
            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
                {loading && (
                    <View className="px-5 gap-3 pt-2">
                        <SkeletonLoader.List count={6} />
                    </View>
                )}

                {!loading && displayGroups.length === 0 && (
                    <EmptyState
                        icon="receipt-long"
                        title="Sin movimientos"
                        subtitle={selectedDay ? 'No hay movimientos para este dia' : 'No hay movimientos este mes'}
                        actionLabel={selectedDay ? undefined : undefined}
                    />
                )}

                {!loading && displayGroups.map((group, gi) => (
                    <FadeIn key={group.date} delay={gi * 50}>
                        <View className="mx-5 mb-3">
                            {/* Day header with subtotal */}
                            <View className="flex-row items-center justify-between py-2">
                                <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    {getDayLabel(group.date)}
                                </Text>
                                <View className="flex-row items-center gap-2">
                                    <Text className="text-xs font-medium text-slate-400 dark:text-slate-500">
                                        {group.transactions.length} mov.
                                    </Text>
                                    {group.expense > 0 && !isAllAccounts && (
                                        <Text className="text-xs font-bold text-red-400">
                                            -{formatCurrency(group.expense, selectedAccount?.currency)}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {/* Transactions card */}
                            <View className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                                {group.transactions.map((tx, ti) => (
                                    <View key={tx.id}>
                                        {ti > 0 && <View className="h-px bg-slate-100 dark:bg-slate-800 ml-14" />}
                                        <TransactionRow
                                            transaction={tx}
                                            currency={isAllAccounts
                                                ? accMap[tx.account_id ?? tx.category?.account_id]?.currency
                                                : selectedAccount?.currency
                                            }
                                            onPress={() => handleEditTx(tx)}
                                            onLongPress={() => setDeleteTx(tx)}
                                            accountName={isAllAccounts ? accMap[tx.account_id ?? tx.category?.account_id]?.name : undefined}
                                            accountColor={isAllAccounts ? accMap[tx.account_id ?? tx.category?.account_id]?.color : undefined}
                                            budgetMonthLabel={getBudgetMonthLabel(tx)}
                                        />
                                    </View>
                                ))}
                            </View>
                        </View>
                    </FadeIn>
                ))}

                {/* Show "Ver todo" if filtering by day */}
                {!loading && selectedDay && (
                    <View className="items-center pt-2">
                        <TouchableOpacity onPress={() => setSelectedDay(null)}>
                            <Text className="text-primary text-sm font-bold">Ver todo el mes</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Calendar Sheet */}
            <Modal visible={calendarVisible} animationType="slide" transparent>
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white dark:bg-modal-dark rounded-t-3xl">
                        <View className="items-center pt-3 pb-1">
                            <View className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
                        </View>
                        <View className="flex-row items-center justify-between px-5 pt-3 pb-4">
                            <Text className="text-lg font-bold text-slate-900 dark:text-white">
                                {MONTHS_ES[selectedMonth - 1]} {year}
                            </Text>
                            <View className="flex-row items-center gap-2">
                                {selectedDay && (
                                    <TouchableOpacity
                                        onPress={() => { setSelectedDay(null); setCalendarVisible(false); }}
                                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800"
                                    >
                                        <Text className="text-xs font-bold text-slate-500">Ver todo</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity
                                    onPress={() => setCalendarVisible(false)}
                                    className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
                                >
                                    <MaterialIcons name="close" size={20} color="#64748b" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View className="px-5 pb-8">
                            <View className="flex-row justify-between mb-2">
                                {['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'].map(day => (
                                    <Text key={day} className="w-11 text-center text-xs font-semibold text-slate-400 uppercase">{day}</Text>
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
                message={deleteTx ? `Eliminar "${deleteTx.category?.name ?? 'Sin categoria'}" por ${formatCurrency(deleteTx.amount, accMap[deleteTx.account_id ?? deleteTx.category?.account_id]?.currency)}?` : ''}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTx(null)}
            />
            {ToastComponent}
        </FrostBackground>
    );
}
