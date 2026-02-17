import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useMemo, useCallback } from 'react';
import { useCategories } from '../../src/hooks/useCategories';
import { useAccounts } from '../../src/hooks/useAccounts';
import { deleteCategory } from '../../src/services/categoriesService';
import { deleteAccount } from '../../src/services/accountsService';
import { emitCategoriesChange, emitAccountsChange } from '../../src/lib/events';
import { getCategoryStyle, formatCurrency } from '../../src/lib/helpers';

const ACCOUNT_TYPE_LABELS = {
    cash: 'Efectivo',
    bank: 'Banco',
    credit: 'Crédito',
    savings: 'Ahorro',
    other: 'Otro',
};

export default function SettingsScreen() {
    const router = useRouter();
    const { categories, loading: catsLoading, error: catsError, refresh: refreshCats } = useCategories();
    const { accounts, loading: accsLoading, error: accsError, refresh: refreshAccs } = useAccounts();

    const [activeTab, setActiveTab] = useState('categories');
    const [editing, setEditing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const expenseCats = categories.filter(c => c.type === 'expense');
    const incomeCats = categories.filter(c => c.type === 'income');

    const accountsTotalUYU = useMemo(
        () => accounts.filter(a => (a.currency ?? 'UYU') === 'UYU').reduce((s, a) => s + Number(a.balance), 0),
        [accounts]
    );
    const accountsTotalUSD = useMemo(
        () => accounts.filter(a => a.currency === 'USD').reduce((s, a) => s + Number(a.balance), 0),
        [accounts]
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            if (activeTab === 'categories') await refreshCats();
            else await refreshAccs();
        } finally {
            setRefreshing(false);
        }
    }, [activeTab, refreshCats, refreshAccs]);

    const handleDeleteCategory = (cat) => {
        Alert.alert(
            'Eliminar categoría',
            `¿Seguro que querés eliminar "${cat.name}"? Las transacciones asociadas no se eliminarán.`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteCategory(cat.id);
                            emitCategoriesChange();
                        } catch (e) {
                            Alert.alert('Error', e.message);
                        }
                    },
                },
            ]
        );
    };

    const handleEditCategory = (cat) => {
        if (editing) return;
        router.push({
            pathname: '/add-category',
            params: {
                id: cat.id,
                name: cat.name,
                catType: cat.type,
                icon: cat.icon,
                color: cat.color,
            },
        });
    };

    const handleDeleteAccount = (acc) => {
        Alert.alert(
            'Eliminar cuenta',
            `¿Seguro que querés eliminar "${acc.name}"?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteAccount(acc.id);
                            emitAccountsChange();
                        } catch (e) {
                            Alert.alert('Error', e.message);
                        }
                    },
                },
            ]
        );
    };

    const handleEditAccount = (acc) => {
        if (editing) return;
        router.push({
            pathname: '/add-account',
            params: {
                id: acc.id,
                name: acc.name,
                type: acc.type,
                icon: acc.icon,
                color: acc.color,
                balance: String(acc.balance),
                currency: acc.currency ?? 'UYU',
            },
        });
    };

    const renderCategoryItem = (cat, i, list) => {
        const style = getCategoryStyle(cat.color);
        return (
            <TouchableOpacity
                key={cat.id}
                onPress={() => handleEditCategory(cat)}
                activeOpacity={editing ? 1 : 0.7}
                className={`flex-row items-center gap-4 p-4 ${i < list.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}
            >
                {editing && (
                    <TouchableOpacity onPress={() => handleDeleteCategory(cat)} hitSlop={8}>
                        <MaterialIcons name="remove-circle" size={22} color="#ef4444" />
                    </TouchableOpacity>
                )}
                <View className={`h-10 w-10 rounded-full ${style.bgCircle} items-center justify-center`}>
                    <MaterialIcons name={cat.icon} size={20} color={style.hex} />
                </View>
                <Text className="flex-1 font-semibold text-sm text-slate-900 dark:text-white">{cat.name}</Text>
                {!editing && (
                    <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
                )}
            </TouchableOpacity>
        );
    };

    const renderEmptyState = (message) => (
        <View className="py-8 items-center">
            <MaterialIcons name="inbox" size={40} color="#94a3b8" />
            <Text className="text-slate-400 text-sm mt-2 text-center">{message}</Text>
        </View>
    );

    const renderErrorState = (message) => (
        <View className="py-6 items-center mx-4">
            <MaterialIcons name="error-outline" size={36} color="#ef4444" />
            <Text className="text-red-400 text-sm mt-2 text-center">{message}</Text>
        </View>
    );

    return (
        <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800">
                <View style={{ width: 70 }} />
                <Text className="text-base font-bold text-slate-900 dark:text-white">Gestión</Text>
                <TouchableOpacity onPress={() => setEditing(!editing)} style={{ width: 70, alignItems: 'flex-end' }}>
                    <Text className="text-primary font-bold text-base">
                        {editing ? 'Listo' : 'Editar'}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#137fec" colors={['#137fec']} />
                }
            >
                {/* Tabs Toggle */}
                <View className="px-4 py-6">
                    <View className="bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl flex-row items-center">
                        <TouchableOpacity
                            onPress={() => { setActiveTab('categories'); setEditing(false); }}
                            className={`flex-1 py-1.5 rounded-lg ${activeTab === 'categories' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
                        >
                            <Text className={`text-center text-sm font-bold ${activeTab === 'categories' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                Categorías
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => { setActiveTab('accounts'); setEditing(false); }}
                            className={`flex-1 py-1.5 rounded-lg ${activeTab === 'accounts' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
                        >
                            <Text className={`text-center text-sm font-bold ${activeTab === 'accounts' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
                                Cuentas
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ===== CATEGORIES TAB ===== */}
                {activeTab === 'categories' && (
                    <>
                        {catsLoading && !refreshing && <ActivityIndicator color="#137fec" style={{ margin: 20 }} />}

                        {catsError && renderErrorState(catsError)}

                        {!catsLoading && !catsError && (
                            <>
                                {/* Expense Categories */}
                                <View className="mb-8">
                                    <View className="flex-row items-center justify-between px-6 pb-2">
                                        <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                            Categorías de Gastos ({expenseCats.length})
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => router.push({ pathname: '/add-category', params: { type: 'expense' } })}
                                            className="flex-row items-center gap-1"
                                        >
                                            <MaterialIcons name="add-circle" size={18} color="#137fec" />
                                            <Text className="text-xs font-bold text-primary">AÑADIR</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {expenseCats.length === 0 ? (
                                        renderEmptyState('No tenés categorías de gastos.\nCreá una para organizar tus movimientos.')
                                    ) : (
                                        <View className="bg-white dark:bg-[#1a242f] mx-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800/50">
                                            {expenseCats.map((cat, i) => renderCategoryItem(cat, i, expenseCats))}
                                        </View>
                                    )}
                                </View>

                                {/* Income Categories */}
                                <View className="mb-8">
                                    <View className="flex-row items-center justify-between px-6 pb-2">
                                        <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                            Categorías de Ingresos ({incomeCats.length})
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => router.push({ pathname: '/add-category', params: { type: 'income' } })}
                                            className="flex-row items-center gap-1"
                                        >
                                            <MaterialIcons name="add-circle" size={18} color="#137fec" />
                                            <Text className="text-xs font-bold text-primary">AÑADIR</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {incomeCats.length === 0 ? (
                                        renderEmptyState('No tenés categorías de ingresos.\nCreá una para registrar lo que ganás.')
                                    ) : (
                                        <View className="bg-white dark:bg-[#1a242f] mx-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800/50">
                                            {incomeCats.map((cat, i) => renderCategoryItem(cat, i, incomeCats))}
                                        </View>
                                    )}
                                </View>
                            </>
                        )}
                    </>
                )}

                {/* ===== ACCOUNTS TAB ===== */}
                {activeTab === 'accounts' && (
                    <>
                        {accsLoading && !refreshing && <ActivityIndicator color="#137fec" style={{ margin: 20 }} />}

                        {accsError && renderErrorState(
                            accsError.includes('relation') || accsError.includes('does not exist')
                                ? 'La tabla "accounts" no existe en Supabase. Creala con el SQL del archivo accountsService.ts.'
                                : accsError
                        )}

                        {!accsLoading && !accsError && (
                            <>
                                {/* Balance Summary */}
                                {accounts.length > 0 && (
                                    <View className="mx-4 mb-6 bg-white dark:bg-[#1a242f] rounded-xl border border-slate-200 dark:border-slate-800/50 p-4">
                                        <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Saldo total</Text>
                                        <View className="flex-row items-center justify-between">
                                            <View className="flex-row items-center gap-2">
                                                <View className="h-8 w-8 rounded-full bg-primary/20 items-center justify-center">
                                                    <MaterialIcons name="account-balance-wallet" size={16} color="#137fec" />
                                                </View>
                                                <Text className="text-xl font-extrabold text-slate-900 dark:text-white">
                                                    {formatCurrency(accountsTotalUYU)}
                                                </Text>
                                            </View>
                                            {accountsTotalUSD > 0 && (
                                                <View className="flex-row items-center gap-2">
                                                    <View className="h-8 w-8 rounded-full bg-emerald-500/20 items-center justify-center">
                                                        <MaterialIcons name="attach-money" size={16} color="#10b981" />
                                                    </View>
                                                    <Text className="text-xl font-extrabold text-slate-900 dark:text-white">
                                                        US{formatCurrency(accountsTotalUSD)}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                )}

                                {/* Account List */}
                                <View className="mb-8">
                                    <View className="flex-row items-center justify-between px-6 pb-2">
                                        <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                            Mis Cuentas ({accounts.length})
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => router.push('/add-account')}
                                            className="flex-row items-center gap-1"
                                        >
                                            <MaterialIcons name="add-circle" size={18} color="#137fec" />
                                            <Text className="text-xs font-bold text-primary">AÑADIR</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {accounts.length === 0 ? (
                                        renderEmptyState('No tenés cuentas registradas.\nAgregá tus cuentas para un mejor seguimiento.')
                                    ) : (
                                        <View className="bg-white dark:bg-[#1a242f] mx-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800/50">
                                            {accounts.map((acc, i) => {
                                                const style = getCategoryStyle(acc.color);
                                                const currSymbol = (acc.currency ?? 'UYU') === 'USD' ? 'US' : '';
                                                return (
                                                    <TouchableOpacity
                                                        key={acc.id}
                                                        onPress={() => handleEditAccount(acc)}
                                                        activeOpacity={editing ? 1 : 0.7}
                                                        className={`flex-row items-center gap-4 p-4 ${i < accounts.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}
                                                    >
                                                        {editing && (
                                                            <TouchableOpacity onPress={() => handleDeleteAccount(acc)} hitSlop={8}>
                                                                <MaterialIcons name="remove-circle" size={22} color="#ef4444" />
                                                            </TouchableOpacity>
                                                        )}
                                                        <View className={`h-10 w-10 rounded-full ${style.bgCircle} items-center justify-center`}>
                                                            <MaterialIcons name={acc.icon} size={20} color={style.hex} />
                                                        </View>
                                                        <View className="flex-1">
                                                            <Text className="font-semibold text-sm text-slate-900 dark:text-white">{acc.name}</Text>
                                                            <Text className="text-xs text-slate-500">
                                                                {ACCOUNT_TYPE_LABELS[acc.type] ?? acc.type}
                                                            </Text>
                                                        </View>
                                                        <Text className="font-bold text-sm text-slate-900 dark:text-white">
                                                            {currSymbol}{formatCurrency(acc.balance)}
                                                        </Text>
                                                        {!editing && (
                                                            <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
                                                        )}
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    )}
                                </View>
                            </>
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
