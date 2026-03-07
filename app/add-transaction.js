import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { showError } from '../src/lib/friendlyError';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useMemo } from 'react';
import { Button, SkeletonLoader } from '../components/ui';
import { useCategories } from '../src/hooks/useCategories';
import { useAccounts } from '../src/hooks/useAccounts';
import { createTransaction, updateTransaction } from '../src/services/transactionsService';
import { emitTransactionsChange } from '../src/lib/events';
import { toDateISO, MONTHS_ES, DAYS_ES, getCurrencySymbol } from '../src/lib/helpers';
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
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [calendarExpanded, setCalendarExpanded] = useState(isEdit && initialDate !== todayStr);

    // Calendar state
    const [calYear, setCalYear] = useState(initialDateParts[0] || now.getFullYear());
    const [calMonth, setCalMonth] = useState(initialDateParts[1] || now.getMonth() + 1);

    const { categories, loading: loadingCats } = useCategories(type);
    const { accounts } = useAccounts();

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
            const payload = {
                amount: numAmount,
                type,
                category_id: selectedCategory || null,
                account_id: selectedAccount || null,
                note: note.trim() || null,
                date: selectedDate,
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
                            onPress={() => { setType('expense'); setSelectedCategory(null); }}
                            className={`flex-1 items-center justify-center rounded-lg h-full ${type === 'expense' ? 'bg-white dark:bg-modal-dark shadow-sm' : ''}`}
                        >
                            <Text className={`text-sm font-bold ${type === 'expense' ? 'text-red-500' : 'text-slate-500'}`}>Gasto</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => { setType('income'); setSelectedCategory(null); }}
                            className={`flex-1 items-center justify-center rounded-lg h-full ${type === 'income' ? 'bg-white dark:bg-modal-dark shadow-sm' : ''}`}
                        >
                            <Text className={`text-sm font-bold ${type === 'income' ? 'text-emerald-500' : 'text-slate-500'}`}>Ingreso</Text>
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
                                <View key={cat.id} className="items-center gap-2 mb-4 w-[22%]">
                                    <TouchableOpacity
                                        onPress={() => {
                                            const newId = isActive ? null : cat.id;
                                            setSelectedCategory(newId);
                                            if (newId && cat.account_id) {
                                                setSelectedAccount(cat.account_id);
                                            }
                                        }}
                                        className={`h-14 w-14 rounded-2xl items-center justify-center ${isActive ? 'bg-primary shadow-sm shadow-primary/20' : 'bg-frost dark:bg-input-dark'}`}
                                    >
                                        <MaterialIcons name={cat.icon} size={28} color={isActive ? 'white' : '#475569'} />
                                    </TouchableOpacity>
                                    <Text className={`text-xs font-semibold ${isActive ? 'text-primary' : 'text-slate-500'}`} numberOfLines={1}>{cat.name}</Text>
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
                                        className={`flex-row items-center gap-2 mr-3 px-4 py-2.5 rounded-xl ${isActive ? 'bg-primary/10 border border-primary/20' : 'bg-frost dark:bg-input-dark'}`}
                                    >
                                        <MaterialIcons name={acc.icon || 'account-balance-wallet'} size={18} color={isActive ? '#6366F1' : '#475569'} />
                                        <Text className={`text-sm font-semibold ${isActive ? 'text-primary' : 'text-slate-600 dark:text-slate-400'}`}>{acc.name}</Text>
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
                                            <Text className={`text-xs ${isSelected ? 'font-bold text-white' : isDayToday ? 'font-bold text-primary' : 'text-slate-700 dark:text-slate-300'}`}>{d}</Text>
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
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
