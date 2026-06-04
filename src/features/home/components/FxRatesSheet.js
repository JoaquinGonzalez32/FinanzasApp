/**
 * FxRatesSheet — manual exchange-rate editor (R7).
 *
 * One row per non-base currency present in the user's accounts:
 *   "1 US$ = [____] $U"
 * Rates are persisted locally via useFxRates → no server round-trip.
 */
import { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { BottomSheet, Button } from '../../../../components/ui';
import { getCurrencySymbol } from '../../../lib/helpers';

const CURRENCY_LABELS = { UYU: 'Pesos uruguayos', USD: 'Dólares', EUR: 'Euros' };

export default function FxRatesSheet({ visible, onClose, baseCurrency, currencies, rates, setRate }) {
    // Local draft so typing doesn't thrash storage on every keystroke.
    const [draft, setDraft] = useState({});

    const valueFor = (cur) => {
        if (draft[cur] !== undefined) return draft[cur];
        const r = rates[cur];
        return r ? String(r) : '';
    };

    const handleSave = () => {
        for (const cur of currencies) {
            const raw = draft[cur];
            if (raw === undefined) continue;
            const n = parseFloat(raw.replace(',', '.'));
            setRate(cur, n); // setRate clears the rate when n is invalid/<=0
        }
        setDraft({});
        onClose?.();
    };

    return (
        <BottomSheet
            visible={visible}
            onClose={onClose}
            title="Tipos de cambio"
            subtitle={`Para ver tu neto en ${CURRENCY_LABELS[baseCurrency] || baseCurrency}`}
        >
            <View className="px-5 pt-4 pb-2">
                {currencies.map((cur) => (
                    <View key={cur} className="flex-row items-center justify-between mb-4">
                        <Text className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            1 {getCurrencySymbol(cur)}
                            <Text className="text-slate-400 font-medium"> ({cur})</Text>
                        </Text>
                        <View className="flex-row items-center gap-2">
                            <Text className="text-sm font-semibold text-slate-400">=</Text>
                            <TextInput
                                className="w-28 h-11 px-3 rounded-xl bg-frost dark:bg-input-dark text-slate-900 dark:text-white text-base font-bold text-right"
                                placeholder="0"
                                placeholderTextColor="#94A3B8"
                                keyboardType="decimal-pad"
                                value={valueFor(cur)}
                                onChangeText={(t) => setDraft((d) => ({ ...d, [cur]: t }))}
                                maxLength={12}
                            />
                            <Text className="text-sm font-bold text-slate-500 w-12">{getCurrencySymbol(baseCurrency)}</Text>
                        </View>
                    </View>
                ))}

                <Text className="text-xs text-slate-400 leading-5 mb-4">
                    Las tasas son manuales y se guardan en este dispositivo. Se usan solo para
                    estimar tu neto total; no modifican los montos de cada cuenta.
                </Text>

                <Button variant="primary" size="lg" fullWidth icon="check" onPress={handleSave}>
                    Guardar tipos de cambio
                </Button>
            </View>
        </BottomSheet>
    );
}
