import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { showError, friendlyMessage } from '../src/lib/friendlyError';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useMemo } from 'react';
import { Button, SkeletonLoader, useToast } from '../components/ui';
import ConfirmModal from '../components/ConfirmModal';
import { useCategories } from '../src/hooks/useCategories';
import { useAccounts } from '../src/hooks/useAccounts';
import { createTransaction, updateTransaction, deleteTransaction } from '../src/services/transactionsService';
import { emitTransactionsChange } from '../src/lib/events';
import { toDateISO, MONTHS_ES, DAYS_ES, getCurrencySymbol, shiftMonth, monthLabel } from '../src/lib/helpers';
import { useAccountContext } from '../src/context/AccountContext';

export default function AddTransactionScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const isEdit = !!params.editId;

    const now = new Date();
    const todayStr = toDateISO(now);

    const initialDate = params.editDate || todayStr;
    const initialDateParts = initialDate.split('-').map(Number);

    const { selectedAccountId: globalAccountId, isAllAccounts } = useAccountContext();

    // Preselect account: edit params > route params > global selector > first account
    const defaultAccountId = params.editAccountId || params.account || (isAllAccounts ? null : globalAccountId) || null;

    const [type, setType] = useState(params.type === 'income' ? 'income' : 'expense');
    const [amount, setAmount] = useState(params.editAmount || '');
    const [selectedCategory, setSelectedCategory] = useState(params.editCategoryId || params.category || null);
    const [selectedAccount, setSelectedAccount] = useState(defaultAccountId);
    const [note, setNote] = useState(params.editNote || '');
    const [submitting, setSubmitting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const { show: showToast, ToastComponent } = useToast();
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [calendarExpanded, setCalendarExpanded] = useState(isEdit && initialDate !== todayStr);

    // Budget month: null = same as date month (default). Only set when user picks a different month.
    const [budgetMonth, setBudgetMonth] = useState(params.editBudgetMonth || null);
    const [budgetMonthExpanded, setBudgetMonthExpanded] = useState(!!params.editBudgetMonth);

    // Calendar state
    const [calYear, setCalYear] = useState(initialDateParts[0] || now.getFullYear());
    const [calMonth, setCalMonth] = useState(initialDateParts[1] || now.getMonth() + 1);

    const { categories, loading: loadingCats } = useCategories(type);
    const { accounts } = useAccounts();

    // Budget month picker: current date month ± 2
    const dateMonth = selectedDate.substring(0, 7);
    const effectiveBudgetMonth = budgetMonth || dateMonth;
    const budgetMonthOptions = useMemo(() => {
        const opts = [];
        for (let d = -2; d <= 2; d++) {
            opts.push(shiftMonth(dateMonth, d));
        }
        return opts;
    }, [dateMonth]);

    // Calendar grid
    const firstDayOfWeek = new Date(calYear, calMonth - 1, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth, 0).getDate();
    const daysInPrevMonth = new Date(calYear, calMonth - 1, 0).getDate();

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

    const prevMonth = () => {
        if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); }
        else setCalMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); }
        else setCalMonth(m => m + 1);
    };

    const selectDay = (d) => {
        const iso = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        setSelectedDate(iso);
    };

    // Parse selected date for display
    const selParts = selectedDate.split('-');
    const selDay = parseInt(selParts[2], 10);
    const selMonth = parseInt(selParts[1], 10);
    const selYear = parseInt(selParts[0], 10);
    const isSelectedInView = selYear === calYear && selMonth === calMonth;

    // Formatted date label
    const selectedDateObj = new Date(selYear, selMonth - 1, selDay);
    const isToday = selectedDate === todayStr;
    const dateLabel = isToday
        ? `Hoy, ${selDay} de ${MONTHS_ES[selMonth - 1]}`
        : `${DAYS_ES[selectedDateObj.getDay()]}, ${selDay} de ${MONTHS_ES[selMonth - 1]}`;

    const handleConfirm = async () => {
        const numAmount = parseFloat(amount.replace(',', '.'));
        if (!numAmount || numAmount <= 0) return;
        setSubmitting(true);
        try {
            // budget_month: only store when income AND differs from date month
            const bm = type === 'income' && effectiveBudgetMonth !== dateMonth
                ? effectiveBudgetMonth
                : null;
            const payload = {
                amount: numAmount,
                type,
                category_id: selectedCategory || null,
                account_id: selectedAccount || null,
                note: note.trim() || null,
                date: selectedDate,
                budget_month: bm,
            };
            if (isEdit) {
                await updateTransaction(params.editId, payload);
            } else {
                await createTransaction(payload);
            }
            emitTransactionsChange();
            router.back();
        } catch (e) {
            showError(e);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        setShowDeleteConfirm(false);
        setSubmitting(true);
        try {
            await deleteTransaction(params.editId);
            emitTransactionsChange();
            router.back();
        } catch (e) {
            showToast({ type: 'error', message: friendlyMessage(e) });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white dark:bg-modal-dark"
        >
            <View className="flex-row items-center justify-between px-5 pt-3 pb-2">
                <Pressable onPress={() => router.back()} style={{ height: 40, width: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 }}>
                    <MaterialIcons name="arrow-back-ios-new" size={20} color="#475569" />
                </Pressable>
                <Text className="text-base font-bold text-slate-900 dark:text-white">{isEdit ? 'Editar Transaccion' : 'Nueva Transaccion'}</Text>
                <View className="w-10" />
            </View>

            <ScrollView className="flex-1">

                {/* Amount */}
                <View className="px-6 pt-4 pb-6 items-center">
                    <View className="w-full bg-slate-50 dark:bg-surface-dark rounded-2xl dark:border dark:border-slate-700/50 px-5 py-5 items-center">
                        <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Monto</Text>
                        <View className="flex-row items-center justify-center">
                            <Text className="text-3xl font-bold text-slate-400 dark:text-slate-300 mr-1">{getCurrencySymbol(accounts.find(a => a.id === selectedAccount)?.currency)}</Text>
                            <TextInput
                                className="text-slate-900 dark:text-white text-[48px] font-extrabold leading-tight p-0 min-w-[80px] text-center"
                                placeholder="0.00"
                                placeholderTextColor="#CBD5E1"
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="decimal-pad"
                                autoFocus={!isEdit}
                                maxLength={15}
                            />
                        </View>
                    </View>
                </View>

                {/* Type Toggle */}
                <View className="px-6 mb-6">
                    <View className="flex-row h-12 w-full items-center justify-center rounded-xl bg-frost dark:bg-input-dark p-1.5">
                        <TouchableOpacity
                            onPress={() => { setType('expense'); setSelectedCategory(null); setBudgetMonth(null); setBudgetMonthExpanded(false); }}
                            className="flex-1 items-center justify-center rounded-lg h-full"
                            style={type === 'expense' ? { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 } : undefined}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '700', color: type === 'expense' ? '#ef4444' : '#64748B' }}>Gasto</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => { setType('income'); setSelectedCategory(null); }}
                            className="flex-1 items-center justify-center rounded-lg h-full"
                            style={type === 'income' ? { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 } : undefined}
                        >
                            <Text style={{ fontSize: 14, fontWeight: '700', color: type === 'income' ? '#10b981' : '#64748B' }}>Ingreso</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Category Grid */}
                <View className="px-6 mb-6">
                    <Text className="text-sm font-bold text-slate-900 dark:text-white mb-3">Categoria</Text>
                    {loadingCats && (
                        <View className="flex-row flex-wrap gap-3">
                            {Array.from({ length: 8 }).map((_, i) => (
                                <SkeletonLoader.Pulse key={i} style={{ width: 56, height: 56, borderRadius: 16 }} />
                            ))}
                        </View>
                    )}
                    <View className="flex-row flex-wrap justify-between">
                        {categories.map((cat) => {
                            const isActive = selectedCategory === cat.id;
                            return (
                                <View key={cat.id} style={{ width: '22%', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                    <TouchableOpacity
                                        onPress={() => {
                                            const newId = isActive ? null : cat.id;
                                            setSelectedCategory(newId);
                                            if (newId && cat.account_id) {
                                                setSelectedAccount(cat.account_id);
                                            }
                                        }}
                                        style={{
                                            height: 56, width: 56, borderRadius: 16,
                                            alignItems: 'center', justifyContent: 'center',
                                            backgroundColor: isActive ? '#6366F1' : '#F1F5F9',
                                        }}
                                    >
                                        <MaterialIcons name={cat.icon} size={28} color={isActive ? 'white' : '#475569'} />
                                    </TouchableOpacity>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: isActive ? '#6366F1' : '#64748B' }} numberOfLines={1}>{cat.name}</Text>
                                </View>
                            );
                        })}
                        {!loadingCats && categories.length === 0 && (
                            <Text className="text-slate-400 text-sm text-center py-2 w-full">
                                Sin categorias. Crealas en Gestion.
                            </Text>
                        )}
                    </View>
                </View>

                {/* Account */}
                {accounts.length > 0 && (
                    <View className="px-6 mb-6">
                        <Text className="text-sm font-bold text-slate-900 dark:text-white mb-3">Cuenta</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                            {accounts.map((acc) => {
                                const isActive = selectedAccount === acc.id;
                                return (
                                    <TouchableOpacity
                                        key={acc.id}
                                        onPress={() => setSelectedAccount(isActive ? null : acc.id)}
                                        style={{
                                            flexDirection: 'row', alignItems: 'center', gap: 8,
                                            marginRight: 12, paddingHorizontal: 16, paddingVertical: 10,
                                            borderRadius: 12,
                                            backgroundColor: isActive ? 'rgba(99,102,241,0.1)' : '#F1F5F9',
                                            borderWidth: isActive ? 1 : 0,
                                            borderColor: isActive ? 'rgba(99,102,241,0.2)' : 'transparent',
                                        }}
                                    >
                                        <MaterialIcons name={acc.icon || 'account-balance-wallet'} size={18} color={isActive ? '#6366F1' : '#475569'} />
                                        <Text style={{ fontSize: 14, fontWeight: '600', color: isActive ? '#6366F1' : '#475569' }}>{acc.name}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {/* Date — Collapsed by default */}
                <View className="px-6 mb-6">
                    <Text className="text-sm font-bold text-slate-900 dark:text-white mb-3">Fecha</Text>

                    {!calendarExpanded ? (
                        <TouchableOpacity
                            onPress={() => setCalendarExpanded(true)}
                            className="flex-row items-center gap-3 bg-slate-50 dark:bg-surface-dark rounded-xl dark:border dark:border-slate-700/50 px-4 py-3.5"
                        >
                            <View className="h-9 w-9 rounded-lg bg-primary/10 items-center justify-center">
                                <MaterialIcons name="calendar-today" size={18} color="#6366F1" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-sm font-semibold text-slate-900 dark:text-white">{dateLabel}</Text>
                                {isToday && <Text className="text-xs text-slate-400 mt-0.5">Toca para cambiar la fecha</Text>}
                            </View>
                            <MaterialIcons name="chevron-right" size={20} color="#94A3B8" />
                        </TouchableOpacity>
                    ) : (
                        <View className="bg-slate-50 dark:bg-surface-dark rounded-2xl dark:border dark:border-slate-700/50 p-4">
                            {/* Collapse button */}
                            <TouchableOpacity
                                onPress={() => setCalendarExpanded(false)}
                                className="flex-row items-center justify-between mb-3"
                            >
                                <Text className="text-sm font-semibold text-primary">{dateLabel}</Text>
                                <MaterialIcons name="keyboard-arrow-up" size={22} color="#6366F1" />
                            </TouchableOpacity>

                            {/* Month navigation */}
                            <View className="flex-row items-center justify-between mb-3">
                                <TouchableOpacity onPress={prevMonth} className="p-1">
                                    <MaterialIcons name="chevron-left" size={22} color="#94A3B8" />
                                </TouchableOpacity>
                                <Text className="text-sm font-bold text-slate-700 dark:text-slate-300">{MONTHS_ES[calMonth - 1]} {calYear}</Text>
                                <TouchableOpacity onPress={nextMonth} className="p-1">
                                    <MaterialIcons name="chevron-right" size={22} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>

                            {/* Day headers */}
                            <View className="flex-row justify-between mb-1">
                                {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map(d => (
                                    <Text key={d} className="w-11 text-center text-xs font-semibold text-slate-400 uppercase">{d}</Text>
                                ))}
                            </View>

                            {/* Grid */}
                            <View className="flex-row flex-wrap justify-between">
                                {prevDays.map(d => (
                                    <View key={`p-${d}`} className="w-11 h-11 items-center justify-center opacity-25">
                                        <Text className="text-xs dark:text-white">{d}</Text>
                                    </View>
                                ))}

                                {currentDays.map(d => {
                                    const isSelected = isSelectedInView && d === selDay;
                                    const dayISO = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                                    const isDayToday = dayISO === todayStr;
                                    return (
                                        <TouchableOpacity key={d} onPress={() => selectDay(d)} className="w-11 h-11 items-center justify-center">
                                            {isSelected && <View className="absolute inset-0 bg-primary rounded-lg" />}
                                            {!isSelected && isDayToday && <View className="absolute inset-0 border border-primary/30 rounded-lg" />}
                                            <Text style={{
                                                fontSize: 12,
                                                fontWeight: isSelected || isDayToday ? '700' : '400',
                                                color: isSelected ? '#FFFFFF' : isDayToday ? '#6366F1' : '#334155',
                                            }}>{d}</Text>
                                        </TouchableOpacity>
                                    );
                                })}

                                {Array.from({ length: padCells }, (_, i) => (
                                    <View key={`e-${i}`} className="w-11 h-11" />
                                ))}
                            </View>
                        </View>
                    )}
                </View>

                {/* Budget Month — only for income */}
                {type === 'income' && (
                    <View className="px-6 mb-6">
                        {!budgetMonthExpanded && effectiveBudgetMonth === dateMonth ? (
                            <TouchableOpacity
                                onPress={() => setBudgetMonthExpanded(true)}
                                className="flex-row items-center gap-2"
                            >
                                <MaterialIcons name="event-note" size={16} color="#94A3B8" />
                                <Text className="text-xs text-slate-400 font-medium">
                                    ¿Este ingreso aplica a otro mes?
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <View>
                                <Text className="text-sm font-bold text-slate-900 dark:text-white mb-3">Mes de presupuesto</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                                    {budgetMonthOptions.map((m) => {
                                        const isActive = effectiveBudgetMonth === m;
                                        const isSameAsDate = m === dateMonth;
                                        return (
                                            <TouchableOpacity
                                                key={m}
                                                onPress={() => {
                                                    setBudgetMonth(isSameAsDate ? null : m);
                                                }}
                                                style={{
                                                    paddingHorizontal: 14,
                                                    paddingVertical: 8,
                                                    borderRadius: 12,
                                                    marginRight: 8,
                                                    backgroundColor: isActive ? '#6366F1' : '#F1F5F9',
                                                }}
                                            >
                                                <Text style={{
                                                    fontSize: 13,
                                                    fontWeight: isActive ? '700' : '500',
                                                    color: isActive ? '#FFFFFF' : '#64748B',
                                                }}>
                                                    {monthLabel(m)}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                                {effectiveBudgetMonth !== dateMonth && (
                                    <Text className="text-xs text-primary font-medium mt-2">
                                        Este ingreso se contará en el presupuesto de {monthLabel(effectiveBudgetMonth)}
                                    </Text>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {/* Note */}
                <View className="px-6 mb-6">
                    <Text className="text-sm font-bold text-slate-900 dark:text-white mb-3">Nota (opcional)</Text>
                    <TextInput
                        className="w-full h-12 px-4 rounded-xl bg-frost dark:bg-input-dark text-slate-900 dark:text-white text-sm font-medium"
                        placeholder={type === 'expense' ? 'En que gastaste?' : 'De donde proviene?'}
                        placeholderTextColor="#94A3B8"
                        value={note}
                        onChangeText={setNote}
                        maxLength={500}
                    />
                </View>

                {/* Action Button */}
                <View className="px-6 pt-2 pb-8">
                    <Button
                        variant="primary"
                        size="lg"
                        icon="check-circle"
                        fullWidth
                        loading={submitting}
                        disabled={!amount || submitting}
                        onPress={handleConfirm}
                    >
                        {isEdit ? 'Guardar cambios' : `Confirmar ${type === 'expense' ? 'Gasto' : 'Ingreso'}`}
                    </Button>

                    {isEdit && (
                        <TouchableOpacity
                            onPress={() => setShowDeleteConfirm(true)}
                            disabled={submitting}
                            className="flex-row items-center justify-center mt-4 py-3"
                        >
                            <MaterialIcons name="delete-outline" size={18} color="#ef4444" />
                            <Text className="text-red-500 font-semibold text-sm ml-1.5">Eliminar transaccion</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>

            {isEdit && (
                <ConfirmModal
                    visible={showDeleteConfirm}
                    title="Eliminar transaccion"
                    message={`Eliminar este ${type === 'expense' ? 'gasto' : 'ingreso'} de ${getCurrencySymbol(accounts.find(a => a.id === selectedAccount)?.currency)}${amount || '0'}?`}
                    onConfirm={handleDelete}
                    onCancel={() => setShowDeleteConfirm(false)}
                />
            )}
            {ToastComponent}
        </KeyboardAvoidingView>
    );
}
