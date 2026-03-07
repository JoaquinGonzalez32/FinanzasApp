/**
 * AccountSwitcher — Global account selector for the header
 *
 * Collapsed: [color dot] [Account name] [chevron]
 * Expanded: BottomSheet with account list + "Todas las cuentas"
 */
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { BottomSheet, Amount } from '../../components/ui';
import { useAccountContext } from '../context/AccountContext';
import { getCategoryStyle } from '../lib/helpers';

const ACCOUNT_TYPE_LABEL = {
    cash: 'Efectivo',
    bank: 'Banco',
    credit: 'Credito',
    savings: 'Ahorro',
    other: 'Otro',
};

export default function AccountSwitcher() {
    const {
        selectedAccountId,
        selectedAccount,
        accounts,
        selectAccount,
        isAllAccounts,
    } = useAccountContext();

    const [pickerVisible, setPickerVisible] = useState(false);

    const handleSelect = useCallback((accountId) => {
        selectAccount(accountId);
        setPickerVisible(false);
    }, [selectAccount]);

    if (accounts.length === 0) return null;

    const displayName = isAllAccounts
        ? 'Todas las cuentas'
        : selectedAccount?.name ?? 'Cuenta';

    const dotColor = isAllAccounts
        ? '#6366F1'
        : getCategoryStyle(selectedAccount?.color).hex;

    return (
        <>
            {/* Collapsed selector in header */}
            <TouchableOpacity
                onPress={() => setPickerVisible(true)}
                className="flex-row items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl"
                activeOpacity={0.7}
            >
                {isAllAccounts ? (
                    <MaterialIcons name="layers" size={14} color="#6366F1" />
                ) : (
                    <View
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: dotColor }}
                    />
                )}
                <Text
                    className="text-xs font-bold text-slate-700 dark:text-slate-300 max-w-[120px]"
                    numberOfLines={1}
                >
                    {displayName}
                </Text>
                <MaterialIcons name="keyboard-arrow-down" size={16} color="#94A3B8" />
            </TouchableOpacity>

            {/* Account Picker Bottom Sheet */}
            <BottomSheet
                visible={pickerVisible}
                onClose={() => setPickerVisible(false)}
                title="Seleccionar cuenta"
                maxHeight="65%"
            >
                <ScrollView className="px-5 pt-3 pb-8">
                    {/* "Todas las cuentas" option */}
                    <TouchableOpacity
                        onPress={() => handleSelect(null)}
                        className={`flex-row items-center gap-3 p-4 rounded-2xl mb-2 border ${
                            isAllAccounts
                                ? 'bg-primary-faint dark:bg-primary/10 border-primary/20'
                                : 'bg-white dark:bg-card-dark border-slate-200 dark:border-slate-700'
                        }`}
                    >
                        <View className={`h-10 w-10 rounded-xl items-center justify-center ${
                            isAllAccounts ? 'bg-primary/20' : 'bg-slate-100 dark:bg-slate-700'
                        }`}>
                            <MaterialIcons
                                name="layers"
                                size={20}
                                color={isAllAccounts ? '#6366F1' : '#94A3B8'}
                            />
                        </View>
                        <View className="flex-1">
                            <Text className={`text-sm font-bold ${
                                isAllAccounts ? 'text-primary' : 'text-slate-900 dark:text-white'
                            }`}>
                                Todas las cuentas
                            </Text>
                            <Text className="text-xs text-slate-400 mt-0.5">
                                Vista consolidada
                            </Text>
                        </View>
                        {isAllAccounts && (
                            <MaterialIcons name="check-circle" size={20} color="#6366F1" />
                        )}
                    </TouchableOpacity>

                    {/* Divider */}
                    <View className="h-px bg-slate-100 dark:bg-slate-800 my-2" />

                    {/* Individual accounts */}
                    {accounts.map((acc) => {
                        const isActive = acc.id === selectedAccountId;
                        const style = getCategoryStyle(acc.color);
                        return (
                            <TouchableOpacity
                                key={acc.id}
                                onPress={() => handleSelect(acc.id)}
                                className={`flex-row items-center gap-3 p-4 rounded-2xl mb-2 border ${
                                    isActive
                                        ? 'bg-primary-faint dark:bg-primary/10 border-primary/20'
                                        : 'bg-white dark:bg-card-dark border-slate-200 dark:border-slate-700'
                                }`}
                            >
                                <View className={`h-10 w-10 rounded-xl items-center justify-center ${
                                    isActive ? 'bg-primary/20' : style.bg
                                }`}>
                                    <MaterialIcons
                                        name={acc.icon || 'account-balance-wallet'}
                                        size={20}
                                        color={isActive ? '#6366F1' : style.hex}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className={`text-sm font-bold ${
                                        isActive ? 'text-primary' : 'text-slate-900 dark:text-white'
                                    }`}>
                                        {acc.name}
                                    </Text>
                                    <Text className="text-xs text-slate-400 mt-0.5">
                                        {ACCOUNT_TYPE_LABEL[acc.type] || acc.type}
                                    </Text>
                                </View>
                                <Amount
                                    value={acc.balance}
                                    currency={acc.currency}
                                    size="default"
                                    color={isActive ? undefined : 'muted'}
                                />
                                {isActive && (
                                    <MaterialIcons name="check-circle" size={20} color="#6366F1" />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </BottomSheet>
        </>
    );
}
