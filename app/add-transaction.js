import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Pressable } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useMemo } from 'react';
import { useCategories } from '../src/hooks/useCategories';
import { useAccounts } from '../src/hooks/useAccounts';
import { createTransaction } from '../src/services/transactionsService';
import { emitTransactionsChange } from '../src/lib/events';
import { toDateISO, MONTHS_ES, getCurrencySymbol } from '../src/lib/helpers';

export default function AddTransactionScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const now = new Date();
    const todayStr = toDateISO(now);

    const [type, setType] = useState(params.type === 'income' ? 'income' : 'expense');
    const [amount, setAmount] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [selectedDate, setSelectedDate] = useState(todayStr);

    // Calendar state
    const [calYear, setCalYear] = useState(now.getFullYear());
    const [calMonth, setCalMonth] = useState(now.getMonth() + 1);

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

    const handleConfirm = async () => {
        const numAmount = parseFloat(amount.replace(',', '.'));
        if (!numAmount || numAmount <= 0) {
            Alert.alert('Monto inválido', 'Ingresá un monto mayor a cero.');
            return;
        }
        setSubmitting(true);
        try {
            await createTransaction({
                amount: numAmount,
                type,
                category_id: selectedCategory || null,
                account_id: selectedAccount || null,
                note: note.trim() || null,
                date: selectedDate,
            });
            emitTransactionsChange();
            router.back();
        } catch (e) {
            Alert.alert('Error', e.message ?? 'No se pudo crear la transacción.');
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
                <Text className="text-base font-bold text-slate-900 dark:text-white">Nueva Transacción</Text>
                <View className="w-10" />
            </View>

            <ScrollView className="flex-1">

                {/* Amount */}
                <View className="px-6 pt-4 pb-6 items-center">
                    <View className="w-full bg-slate-50 dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-700/50 px-5 py-5 items-center">
                        <Text className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Monto</Text>
                        <View className="flex-row items-center justify-center">
                            <Text className="text-3xl font-bold text-slate-400 mr-1">{getCurrencySymbol(accounts.find(a => a.id === selectedAccount)?.currency)}</Text>
                            <TextInput
                                className="text-slate-900 dark:text-white text-[48px] font-extrabold leading-tight p-0 min-w-[80px] text-center"
                                placeholder="0.00"
                                placeholderTextColor="#cbd5e1"
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="decimal-pad"
                                autoFocus
                            />
                        </View>
                    </View>
                </View>

                {/* Type Toggle */}
                <View className="px-6 mb-8">
                    <View className="flex-row h-12 w-full items-center justify-center rounded-xl bg-slate-100 dark:bg-input-dark p-1.5">
                        <TouchableOpacity
                            onPress={() => { setType('expense'); setSelectedCategory(null); }}
                            className={`flex-1 items-center justify-center rounded-lg h-full ${type === 'expense' ? 'bg-white dark:bg-modal-dark shadow-sm' : ''}`}
                        >
                            <Text className={`text-sm font-bold ${type === 'expense' ? 'text-primary' : 'text-slate-500'}`}>Gasto</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => { setType('income'); setSelectedCategory(null); }}
                            className={`flex-1 items-center justify-center rounded-lg h-full ${type === 'income' ? 'bg-white dark:bg-modal-dark shadow-sm' : ''}`}
                        >
                            <Text className={`text-sm font-bold ${type === 'income' ? 'text-primary' : 'text-slate-500'}`}>Ingreso</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Category Grid */}
                <View className="px-6 mb-8">
                    <Text className="text-slate-900 dark:text-white text-base font-bold mb-4">Categoría</Text>
                    {loadingCats && <ActivityIndicator color="#137fec" style={{ marginVertical: 10 }} />}
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
                                        className={`h-14 w-14 rounded-2xl items-center justify-center ${isActive ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-slate-100 dark:bg-input-dark'}`}
                                    >
                                        <MaterialIcons name={cat.icon} size={28} color={isActive ? 'white' : '#475569'} />
                                    </TouchableOpacity>
                                    <Text className={`text-[11px] font-bold ${isActive ? 'text-primary' : 'text-slate-500'}`}>{cat.name}</Text>
                                </View>
                            );
                        })}
                        {!loadingCats && categories.length === 0 && (
                            <Text className="text-slate-400 text-sm text-center py-2 w-full">
                                Sin categorías. Crealas en Gestión.
                            </Text>
                        )}
                    </View>
                </View>

                {/* Account */}
                {accounts.length > 0 && (
                    <View className="px-6 mb-8">
                        <Text className="text-slate-900 dark:text-white text-base font-bold mb-4">Cuenta</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                            {accounts.map((acc) => {
                                const isActive = selectedAccount === acc.id;
                                return (
                                    <TouchableOpacity
                                        key={acc.id}
                                        onPress={() => setSelectedAccount(isActive ? null : acc.id)}
                                        className={`flex-row items-center gap-2 mr-3 px-4 py-3 rounded-xl ${isActive ? 'bg-primary/10 border border-primary/20' : 'bg-slate-100 dark:bg-input-dark'}`}
                                    >
                                        <MaterialIcons name={acc.icon || 'account-balance-wallet'} size={20} color={isActive ? '#137fec' : '#475569'} />
                                        <Text className={`text-sm font-bold ${isActive ? 'text-primary' : 'text-slate-600 dark:text-slate-400'}`}>{acc.name}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {/* Date Calendar */}
                <View className="px-6 mb-8">
                    <Text className="text-slate-900 dark:text-white text-base font-bold mb-4">Fecha</Text>
                    <View className="bg-slate-50 dark:bg-surface-dark rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4">
                        {/* Month navigation */}
                        <View className="flex-row items-center justify-between mb-3">
                            <TouchableOpacity onPress={prevMonth} className="p-1">
                                <MaterialIcons name="chevron-left" size={22} color="#94a3b8" />
                            </TouchableOpacity>
                            <Text className="text-sm font-bold text-primary">{MONTHS_ES[calMonth - 1]} {calYear}</Text>
                            <TouchableOpacity onPress={nextMonth} className="p-1">
                                <MaterialIcons name="chevron-right" size={22} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>

                        {/* Day headers */}
                        <View className="flex-row justify-between mb-1">
                            {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map(d => (
                                <Text key={d} className="w-11 text-center text-[10px] font-bold text-slate-400 uppercase">{d}</Text>
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
                                const isToday = dayISO === todayStr;
                                return (
                                    <TouchableOpacity key={d} onPress={() => selectDay(d)} className="w-11 h-11 items-center justify-center">
                                        {isSelected && <View className="absolute inset-0 bg-primary rounded-lg" />}
                                        {!isSelected && isToday && <View className="absolute inset-0 border border-primary/30 rounded-lg" />}
                                        <Text className={`text-xs ${isSelected ? 'font-bold text-white' : isToday ? 'font-bold text-primary' : 'text-slate-700 dark:text-slate-300'}`}>{d}</Text>
                                    </TouchableOpacity>
                                );
                            })}

                            {Array.from({ length: padCells }, (_, i) => (
                                <View key={`e-${i}`} className="w-11 h-11" />
                            ))}
                        </View>
                    </View>
                </View>

                {/* Note */}
                <View className="px-6 mb-8">
                    <Text className="text-slate-900 dark:text-white text-base font-bold mb-3">Nota (opcional)</Text>
                    <TextInput
                        className="w-full h-12 px-4 rounded-xl bg-slate-100 dark:bg-input-dark text-slate-900 dark:text-white text-sm"
                        placeholder={type === 'expense' ? '¿En qué gastaste?' : '¿De dónde proviene?'}
                        placeholderTextColor="#94a3b8"
                        value={note}
                        onChangeText={setNote}
                    />
                </View>

                {/* Action Button */}
                <View className="px-6 pt-2 pb-8">
                    <TouchableOpacity
                        onPress={handleConfirm}
                        disabled={submitting}
                        className={`w-full bg-primary py-4 rounded-2xl shadow-xl shadow-primary/25 flex-row items-center justify-center gap-2 ${submitting ? 'opacity-50' : ''}`}
                    >
                        {submitting ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <MaterialIcons name="check-circle" size={24} color="white" />
                                <Text className="text-white font-bold text-base">
                                    Confirmar {type === 'expense' ? 'Gasto' : 'Ingreso'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
