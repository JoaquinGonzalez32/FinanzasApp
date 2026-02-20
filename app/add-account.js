import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { createAccount, updateAccount } from '../src/services/accountsService';
import { emitAccountsChange } from '../src/lib/events';
import { CATEGORY_COLORS, getCategoryStyle, getCurrencySymbol } from '../src/lib/helpers';

const ACCOUNT_TYPES = [
    { key: 'cash', label: 'Efectivo', icon: 'payments' },
    { key: 'bank', label: 'Banco', icon: 'account-balance' },
    { key: 'credit', label: 'Crédito', icon: 'credit-card' },
    { key: 'savings', label: 'Ahorro', icon: 'savings' },
    { key: 'other', label: 'Otro', icon: 'account-balance-wallet' },
];

const ICON_OPTIONS = [
    'payments', 'account-balance', 'credit-card', 'savings',
    'account-balance-wallet', 'store', 'local-atm', 'monetization-on',
    'attach-money', 'money', 'currency-exchange', 'wallet',
];

const COLOR_KEYS = Object.keys(CATEGORY_COLORS).filter(k => k !== 'slate');

export default function AddAccountScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const isEditing = !!params.id;

    const [name, setName] = useState('');
    const [accountType, setAccountType] = useState('cash');
    const [selectedIcon, setSelectedIcon] = useState('payments');
    const [selectedColor, setSelectedColor] = useState('primary');
    const [balance, setBalance] = useState('');
    const [currency, setCurrency] = useState('UYU');
    const [includeInTotal, setIncludeInTotal] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isEditing) {
            setName(typeof params.name === 'string' ? params.name : '');
            setAccountType(typeof params.type === 'string' ? params.type : 'cash');
            setSelectedIcon(typeof params.icon === 'string' ? params.icon : 'payments');
            setSelectedColor(typeof params.color === 'string' ? params.color : 'primary');
            setBalance(typeof params.balance === 'string' ? params.balance : '0');
            setCurrency(typeof params.currency === 'string' ? params.currency : 'UYU');
            setIncludeInTotal(params.include_in_total === 'false' ? false : true);
        }
    }, [isEditing]);

    const handleSubmit = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Ingresá un nombre para la cuenta');
            return;
        }

        const parsedBalance = parseFloat(balance.replace(',', '.')) || 0;

        setSubmitting(true);
        try {
            if (isEditing && typeof params.id === 'string') {
                await updateAccount(params.id, {
                    name: name.trim(),
                    type: accountType,
                    icon: selectedIcon,
                    color: selectedColor,
                    balance: parsedBalance,
                    currency,
                    include_in_total: includeInTotal,
                });
            } else {
                await createAccount({
                    name: name.trim(),
                    type: accountType,
                    icon: selectedIcon,
                    color: selectedColor,
                    balance: parsedBalance,
                    currency,
                    include_in_total: includeInTotal,
                });
            }
            emitAccountsChange();
            router.back();
        } catch (e) {
            Alert.alert('Error', e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const previewStyle = getCategoryStyle(selectedColor);

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white dark:bg-modal-dark"
        >
            <View className="items-center pt-3 pb-2">
                <View className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-[#3b4754]" />
            </View>

            <View className="flex-row items-center justify-between px-4 py-2">
                <TouchableOpacity onPress={() => router.back()}>
                    <Text className="text-primary font-medium text-base">Cancelar</Text>
                </TouchableOpacity>
                <Text className="text-base font-bold text-slate-900 dark:text-white">
                    {isEditing ? 'Editar Cuenta' : 'Nueva Cuenta'}
                </Text>
                <TouchableOpacity onPress={handleSubmit} disabled={submitting}>
                    <Text className={`text-primary font-bold text-base ${submitting ? 'opacity-50' : ''}`}>
                        {submitting ? 'Guardando' : 'Guardar'}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Preview */}
                <View className="items-center py-6">
                    <View className={`h-16 w-16 rounded-full ${previewStyle.bgCircle} items-center justify-center`}>
                        <MaterialIcons name={selectedIcon} size={32} color={previewStyle.hex} />
                    </View>
                    <Text className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                        {name || 'Nombre'}
                    </Text>
                </View>

                {/* Name */}
                <View className="px-6 mb-6">
                    <Text className="text-slate-900 dark:text-white text-base font-bold mb-3">Nombre</Text>
                    <View className="bg-slate-100 dark:bg-input-dark rounded-xl px-4 h-12 justify-center">
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            placeholder="Ej: Banco Nación, Efectivo..."
                            placeholderTextColor="#94a3b8"
                            className="text-base text-slate-900 dark:text-white font-medium"
                        />
                    </View>
                </View>

                {/* Currency */}
                <View className="px-6 mb-6">
                    <Text className="text-slate-900 dark:text-white text-base font-bold mb-3">Moneda</Text>
                    <View className="flex-row gap-3">
                        {[
                            { key: 'UYU', label: 'UYU', symbol: '$U', desc: 'Pesos Uruguayos' },
                            { key: 'USD', label: 'USD', symbol: 'US$', desc: 'Dólares' },
                            { key: 'EUR', label: 'EUR', symbol: '€', desc: 'Euros' },
                        ].map((cur) => {
                            const isActive = currency === cur.key;
                            return (
                                <TouchableOpacity
                                    key={cur.key}
                                    onPress={() => setCurrency(cur.key)}
                                    className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl ${isActive ? 'bg-primary' : 'bg-slate-100 dark:bg-input-dark'}`}
                                >
                                    <Text className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                        {cur.symbol}
                                    </Text>
                                    <Text className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                        {cur.desc}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Balance */}
                <View className="px-6 mb-6">
                    <Text className="text-slate-900 dark:text-white text-base font-bold mb-3">
                        {isEditing ? 'Saldo actual' : 'Saldo inicial'}
                    </Text>
                    <View className="bg-slate-100 dark:bg-input-dark rounded-xl px-4 h-12 flex-row items-center">
                        <Text className="text-slate-500 text-base font-bold mr-2">{getCurrencySymbol(currency)}</Text>
                        <TextInput
                            value={balance}
                            onChangeText={setBalance}
                            placeholder="0.00"
                            placeholderTextColor="#94a3b8"
                            keyboardType="decimal-pad"
                            className="flex-1 text-base text-slate-900 dark:text-white font-medium"
                        />
                    </View>
                </View>

                {/* Include in Total */}
                <View className="px-6 mb-6">
                    <View className="flex-row items-center justify-between bg-slate-100 dark:bg-input-dark rounded-xl px-4 h-14">
                        <View className="flex-row items-center gap-3">
                            <MaterialIcons name="functions" size={20} color="#64748b" />
                            <Text className="text-base font-medium text-slate-900 dark:text-white">Incluir en saldo total</Text>
                        </View>
                        <Switch
                            value={includeInTotal}
                            onValueChange={setIncludeInTotal}
                            trackColor={{ false: '#cbd5e1', true: '#137fec' }}
                            thumbColor="white"
                        />
                    </View>
                </View>

                {/* Account Type */}
                <View className="px-6 mb-6">
                    <Text className="text-slate-900 dark:text-white text-base font-bold mb-3">Tipo de cuenta</Text>
                    <View className="flex-row flex-wrap gap-2">
                        {ACCOUNT_TYPES.map((at) => {
                            const isActive = accountType === at.key;
                            return (
                                <TouchableOpacity
                                    key={at.key}
                                    onPress={() => {
                                        setAccountType(at.key);
                                        setSelectedIcon(at.icon);
                                    }}
                                    className={`flex-row items-center gap-2 px-4 py-2.5 rounded-xl ${isActive ? 'bg-primary' : 'bg-slate-100 dark:bg-input-dark'}`}
                                >
                                    <MaterialIcons name={at.icon} size={18} color={isActive ? 'white' : '#64748b'} />
                                    <Text className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                        {at.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Icon Grid */}
                <View className="px-6 mb-6">
                    <Text className="text-slate-900 dark:text-white text-base font-bold mb-3">Icono</Text>
                    <View className="flex-row flex-wrap gap-3">
                        {ICON_OPTIONS.map((icon) => {
                            const isActive = selectedIcon === icon;
                            return (
                                <TouchableOpacity
                                    key={icon}
                                    onPress={() => setSelectedIcon(icon)}
                                    className={`h-12 w-12 rounded-xl items-center justify-center ${isActive ? 'bg-primary' : 'bg-slate-100 dark:bg-input-dark'}`}
                                >
                                    <MaterialIcons name={icon} size={24} color={isActive ? 'white' : '#64748b'} />
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Color Grid */}
                <View className="px-6 mb-8">
                    <Text className="text-slate-900 dark:text-white text-base font-bold mb-3">Color</Text>
                    <View className="flex-row flex-wrap gap-3">
                        {COLOR_KEYS.map((colorKey) => {
                            const style = getCategoryStyle(colorKey);
                            const isActive = selectedColor === colorKey;
                            return (
                                <TouchableOpacity
                                    key={colorKey}
                                    onPress={() => setSelectedColor(colorKey)}
                                    className={`h-12 w-12 rounded-xl items-center justify-center ${isActive ? 'border-2 border-slate-900 dark:border-white' : ''}`}
                                    style={{ backgroundColor: style.hex + '30' }}
                                >
                                    <View className="h-6 w-6 rounded-full" style={{ backgroundColor: style.hex }} />
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
