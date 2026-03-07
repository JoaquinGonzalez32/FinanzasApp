import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card } from '../components/ui';
import { useAccounts } from '../src/hooks/useAccounts';
import { useCategories } from '../src/hooks/useCategories';
import { useWidgetConfig } from '../src/features/widgets/hooks/useWidgetConfig';
import { getCategoryStyle, getCurrencySymbol } from '../src/lib/helpers';
import { getInstalledWidgets } from '../src/features/widgets/services/widgetBridge';

export default function WidgetSettingsScreen() {
    const router = useRouter();
    const { accounts } = useAccounts();
    const { categories } = useCategories('expense');
    const { config, loading: configLoading, update } = useWidgetConfig();

    const [selectedAccount, setSelectedAccount] = useState(null);
    const [selectedCats, setSelectedCats] = useState([]);
    const [selectedCurrency, setSelectedCurrency] = useState('UYU');
    const [installed, setInstalled] = useState({ quickAdd: false, summary: false, lastTransaction: false });

    // Load config into local state
    useEffect(() => {
        if (!configLoading) {
            setSelectedAccount(config.defaultAccountId);
            setSelectedCats(config.fixedCategoryIds);
            setSelectedCurrency(config.currency);
        }
    }, [configLoading]);

    // Check installed widgets
    useEffect(() => {
        getInstalledWidgets().then(setInstalled);
    }, []);

    const toggleCategory = (catId) => {
        setSelectedCats((prev) => {
            if (prev.includes(catId)) {
                return prev.filter((id) => id !== catId);
            }
            if (prev.length >= 5) return prev;
            return [...prev, catId];
        });
    };

    const handleSave = async () => {
        await update({
            defaultAccountId: selectedAccount,
            fixedCategoryIds: selectedCats,
            currency: selectedCurrency,
        });
        router.back();
    };

    const currencies = ['UYU', 'USD', 'EUR'];

    return (
        <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="flex-row items-center px-5 py-3">
                <TouchableOpacity onPress={() => router.back()} className="mr-3">
                    <MaterialIcons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
                <Text className="text-lg font-bold text-stone-800 dark:text-slate-100 flex-1">
                    Configurar Widgets
                </Text>
            </View>

            <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>

                {/* Widget status */}
                <Card className="p-4 mb-4">
                    <Text className="text-sm font-semibold text-stone-700 dark:text-slate-200 mb-2">
                        Widgets instalados
                    </Text>
                    <WidgetStatus label="Registro rapido" active={installed.quickAdd} />
                    <WidgetStatus label="Resumen del mes" active={installed.summary} />
                    <WidgetStatus label="Ultimo movimiento" active={installed.lastTransaction} />
                    {!installed.quickAdd && !installed.summary && !installed.lastTransaction && (
                        <Text className="text-xs text-stone-400 dark:text-slate-500 mt-2">
                            Agrega widgets desde la pantalla de inicio de tu telefono
                        </Text>
                    )}
                </Card>

                {/* Default account */}
                <Card className="p-4 mb-4">
                    <Text className="text-sm font-semibold text-stone-700 dark:text-slate-200 mb-3">
                        Cuenta predeterminada
                    </Text>
                    <Text className="text-xs text-stone-400 dark:text-slate-500 mb-3">
                        Se usa para el widget de registro rapido
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                        <ChipButton
                            label="Automatica"
                            selected={!selectedAccount}
                            onPress={() => setSelectedAccount(null)}
                        />
                        {accounts.map((acc) => (
                            <ChipButton
                                key={acc.id}
                                label={acc.name}
                                selected={selectedAccount === acc.id}
                                onPress={() => setSelectedAccount(acc.id)}
                            />
                        ))}
                    </View>
                </Card>

                {/* Fixed categories */}
                <Card className="p-4 mb-4">
                    <Text className="text-sm font-semibold text-stone-700 dark:text-slate-200 mb-1">
                        Categorias fijas (max 5)
                    </Text>
                    <Text className="text-xs text-stone-400 dark:text-slate-500 mb-3">
                        Anula el calculo automatico de "mas usadas"
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                        {categories.map((cat) => {
                            const style = getCategoryStyle(cat.color);
                            const isSelected = selectedCats.includes(cat.id);
                            return (
                                <TouchableOpacity
                                    key={cat.id}
                                    onPress={() => toggleCategory(cat.id)}
                                    className={`flex-row items-center px-3 py-2 rounded-xl border ${
                                        isSelected
                                            ? 'border-primary bg-primary/10'
                                            : 'border-stone-200 dark:border-slate-700 bg-white/50 dark:bg-surface-dark'
                                    }`}
                                >
                                    <MaterialIcons
                                        name={cat.icon}
                                        size={16}
                                        color={isSelected ? '#6366F1' : style.hex}
                                    />
                                    <Text
                                        className={`text-xs ml-1.5 ${
                                            isSelected
                                                ? 'text-primary font-semibold'
                                                : 'text-stone-600 dark:text-slate-300'
                                        }`}
                                    >
                                        {cat.name}
                                    </Text>
                                    {isSelected && (
                                        <MaterialIcons name="check" size={14} color="#6366F1" style={{ marginLeft: 4 }} />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    {selectedCats.length > 0 && (
                        <TouchableOpacity onPress={() => setSelectedCats([])} className="mt-2">
                            <Text className="text-xs text-primary">Limpiar seleccion (usar automatico)</Text>
                        </TouchableOpacity>
                    )}
                </Card>

                {/* Currency */}
                <Card className="p-4 mb-4">
                    <Text className="text-sm font-semibold text-stone-700 dark:text-slate-200 mb-3">
                        Moneda del widget
                    </Text>
                    <View className="flex-row gap-2">
                        {currencies.map((cur) => (
                            <ChipButton
                                key={cur}
                                label={`${getCurrencySymbol(cur)} ${cur}`}
                                selected={selectedCurrency === cur}
                                onPress={() => setSelectedCurrency(cur)}
                            />
                        ))}
                    </View>
                </Card>

                {/* Preview */}
                <Card className="p-4 mb-4">
                    <Text className="text-sm font-semibold text-stone-700 dark:text-slate-200 mb-3">
                        Vista previa - Registro rapido
                    </Text>
                    <View className="bg-white/80 dark:bg-card-dark rounded-2xl p-3 border border-white/60 dark:border-slate-700">
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-sm font-bold text-stone-800 dark:text-slate-100">
                                Registro rapido
                            </Text>
                            <Text className="text-xs text-stone-400 dark:text-slate-500">
                                Hoy: {getCurrencySymbol(selectedCurrency)}0
                            </Text>
                        </View>
                        <View className="flex-row justify-around">
                            {(selectedCats.length > 0
                                ? selectedCats.map((id) => categories.find((c) => c.id === id)).filter(Boolean)
                                : categories.slice(0, 5)
                            ).map((cat) => {
                                const style = getCategoryStyle(cat.color);
                                return (
                                    <View key={cat.id} className="items-center">
                                        <View
                                            className="w-11 h-11 rounded-full items-center justify-center"
                                            style={{ backgroundColor: style.hex }}
                                        >
                                            <MaterialIcons name={cat.icon} size={20} color="#fff" />
                                        </View>
                                        <Text className="text-[10px] text-stone-500 dark:text-slate-400 mt-1" numberOfLines={1}>
                                            {cat.name}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                </Card>

                <View className="mb-8">
                    <Button onPress={handleSave} fullWidth>
                        Guardar configuracion
                    </Button>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

function WidgetStatus({ label, active }) {
    return (
        <View className="flex-row items-center py-1.5">
            <MaterialIcons
                name={active ? 'check-circle' : 'radio-button-unchecked'}
                size={18}
                color={active ? '#10b981' : '#a8a29e'}
            />
            <Text className={`text-sm ml-2 ${active ? 'text-stone-700 dark:text-slate-200' : 'text-stone-400 dark:text-slate-500'}`}>
                {label}
            </Text>
        </View>
    );
}

function ChipButton({ label, selected, onPress }) {
    return (
        <TouchableOpacity
            onPress={onPress}
            className={`px-3 py-2 rounded-xl border ${
                selected
                    ? 'border-primary bg-primary/10'
                    : 'border-stone-200 dark:border-slate-700 bg-white/50 dark:bg-surface-dark'
            }`}
        >
            <Text
                className={`text-xs ${
                    selected ? 'text-primary font-semibold' : 'text-stone-600 dark:text-slate-300'
                }`}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );
}
