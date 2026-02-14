import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useMemo } from 'react';
import { useCategories } from '../src/hooks/useCategories';
import { createTransaction } from '../src/services/transactionsService';
import { emitTransactionsChange } from '../src/lib/events';
import { toDateISO, DAYS_ES } from '../src/lib/helpers';

function buildRecentDates(count) {
    const dates = [];
    for (let i = 0; i < count; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push({
            iso: toDateISO(d),
            day: d.getDate(),
            weekday: DAYS_ES[d.getDay()].slice(0, 3),
            label: i === 0 ? 'Hoy' : i === 1 ? 'Ayer' : null,
        });
    }
    return dates;
}

export default function AddTransactionScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const [type, setType] = useState(params.type === 'income' ? 'income' : 'expense');
    const [amount, setAmount] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [showAllDates, setShowAllDates] = useState(false);

    const recentDates = useMemo(() => buildRecentDates(7), []);
    const todayStr = recentDates[0].iso;
    const [selectedDate, setSelectedDate] = useState(todayStr);

    const { categories, loading: loadingCats } = useCategories(type);

    const visibleDates = showAllDates ? recentDates : recentDates.slice(0, 2);

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
            className="flex-1 bg-white dark:bg-[#111418]"
        >
            <View className="items-center pt-3 pb-2">
                <View className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-[#3b4754]" />
            </View>

            <ScrollView className="flex-1">
                <Text className="text-slate-500 dark:text-[#9dabb9] text-xs font-bold uppercase tracking-[0.1em] px-4 py-2 text-center">
                    Nueva Transacción
                </Text>

                {/* Amount */}
                <View className="px-6 pt-4 pb-6 items-center">
                    <View className="flex-row items-center justify-center">
                        <Text className="text-3xl font-bold text-slate-400 mr-1">$</Text>
                        <TextInput
                            className="text-slate-900 dark:text-white text-[48px] font-extrabold leading-tight p-0"
                            placeholder="0.00"
                            placeholderTextColor="#cbd5e1"
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="decimal-pad"
                            autoFocus
                        />
                    </View>
                </View>

                {/* Type Toggle */}
                <View className="px-6 mb-8">
                    <View className="flex-row h-12 w-full items-center justify-center rounded-xl bg-slate-100 dark:bg-[#283039] p-1.5">
                        <TouchableOpacity
                            onPress={() => { setType('expense'); setSelectedCategory(null); }}
                            className={`flex-1 items-center justify-center rounded-lg h-full ${type === 'expense' ? 'bg-white dark:bg-[#111418] shadow-sm' : ''}`}
                        >
                            <Text className={`text-sm font-bold ${type === 'expense' ? 'text-primary' : 'text-slate-500'}`}>Gasto</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => { setType('income'); setSelectedCategory(null); }}
                            className={`flex-1 items-center justify-center rounded-lg h-full ${type === 'income' ? 'bg-white dark:bg-[#111418] shadow-sm' : ''}`}
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
                                        onPress={() => setSelectedCategory(isActive ? null : cat.id)}
                                        className={`h-14 w-14 rounded-2xl items-center justify-center ${isActive ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-slate-100 dark:bg-[#283039]'}`}
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

                {/* Date */}
                <View className="px-6 mb-8">
                    <Text className="text-slate-900 dark:text-white text-base font-bold mb-4">Fecha</Text>
                    <View className="flex-row flex-wrap gap-3">
                        {visibleDates.map((d) => {
                            const isActive = selectedDate === d.iso;
                            return (
                                <TouchableOpacity
                                    key={d.iso}
                                    onPress={() => setSelectedDate(d.iso)}
                                    className={`py-3 rounded-xl items-center ${showAllDates ? 'w-[28%]' : 'flex-1'} ${isActive ? 'bg-primary/10 border border-primary/20' : 'bg-slate-100 dark:bg-[#283039]'}`}
                                >
                                    <Text className={`text-sm font-bold ${isActive ? 'text-primary' : 'text-slate-600 dark:text-slate-400'}`}>
                                        {d.label ?? `${d.weekday} ${d.day}`}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                        {!showAllDates && (
                            <TouchableOpacity
                                onPress={() => setShowAllDates(true)}
                                className="w-12 py-3 items-center justify-center rounded-xl bg-slate-100 dark:bg-[#283039]"
                            >
                                <MaterialIcons name="calendar-today" size={20} color="#475569" />
                            </TouchableOpacity>
                        )}
                    </View>
                    {showAllDates && (
                        <TouchableOpacity onPress={() => setShowAllDates(false)} className="mt-2 self-center">
                            <Text className="text-xs text-primary font-bold">Menos fechas</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Note */}
                <View className="px-6 mb-8">
                    <Text className="text-slate-900 dark:text-white text-base font-bold mb-3">Nota (opcional)</Text>
                    <TextInput
                        className="w-full h-12 px-4 rounded-xl bg-slate-100 dark:bg-[#283039] text-slate-900 dark:text-white text-sm"
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
