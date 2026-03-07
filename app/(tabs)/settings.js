import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { showError } from '../../src/lib/friendlyError';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useMemo, useCallback } from 'react';
import { SkeletonLoader, useToast, FadeIn, ScalePress, FrostBackground } from '../../components/ui';
import { useCategories } from '../../src/hooks/useCategories';
import { useAccounts } from '../../src/hooks/useAccounts';
import { deleteCategory } from '../../src/services/categoriesService';
import { deleteAccount } from '../../src/services/accountsService';
import { emitCategoriesChange, emitAccountsChange } from '../../src/lib/events';
import { getCategoryStyle, formatCurrency } from '../../src/lib/helpers';

const ACCOUNT_TYPE_LABELS = {
    cash: 'Efectivo',
    bank: 'Banco',
    credit: 'Credito',
    savings: 'Ahorro',
    other: 'Otro',
};

export default function SettingsScreen() {
    const router = useRouter();
    const { categories, loading: catsLoading, refresh: refreshCats } = useCategories();
    const { accounts, loading: accsLoading, refresh: refreshAccs } = useAccounts();
    const { show: showToast, ToastComponent } = useToast();
    const [refreshing, setRefreshing] = useState(false);

    const expenseCats = categories.filter(c => c.type === 'expense');
    const incomeCats = categories.filter(c => c.type === 'income');

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try { await Promise.all([refreshCats(), refreshAccs()]); }
        finally { setRefreshing(false); }
    }, [refreshCats, refreshAccs]);

    const handleDeleteCategory = async (cat) => {
        const confirmed = typeof window !== 'undefined' && window.confirm
            ? window.confirm(`Seguro que queres eliminar "${cat.name}"?`)
            : await new Promise((resolve) =>
                Alert.alert(
                    'Eliminar categoria',
                    `Seguro que queres eliminar "${cat.name}"? Las transacciones quedaran sin categoria.`,
                    [
                        { text: 'Cancelar', onPress: () => resolve(false), style: 'cancel' },
                        { text: 'Eliminar', onPress: () => resolve(true), style: 'destructive' },
                    ]
                )
            );
        if (!confirmed) return;
        try {
            await deleteCategory(cat.id);
            emitCategoriesChange();
            showToast({ type: 'success', message: `"${cat.name}" eliminada` });
        } catch (e) { showError(e); }
    };

    const handleEditCategory = (cat) => {
        router.push({
            pathname: '/add-category',
            params: {
                id: cat.id, name: cat.name, catType: cat.type,
                icon: cat.icon, color: cat.color,
                account_id: cat.account_id ?? '',
            },
        });
    };

    const handleDeleteAccount = async (acc) => {
        const confirmed = typeof window !== 'undefined' && window.confirm
            ? window.confirm(`Seguro que queres eliminar "${acc.name}"?`)
            : await new Promise((resolve) =>
                Alert.alert(
                    'Eliminar cuenta',
                    `Seguro que queres eliminar "${acc.name}"?`,
                    [
                        { text: 'Cancelar', onPress: () => resolve(false), style: 'cancel' },
                        { text: 'Eliminar', onPress: () => resolve(true), style: 'destructive' },
                    ]
                )
            );
        if (!confirmed) return;
        try {
            await deleteAccount(acc.id);
            emitAccountsChange();
            showToast({ type: 'success', message: `"${acc.name}" eliminada` });
        } catch (e) { showError(e); }
    };

    const handleViewAccount = (acc) => {
        router.push({
            pathname: '/account-detail',
            params: {
                id: acc.id, name: acc.name, type: acc.type,
                icon: acc.icon, color: acc.color,
                balance: String(acc.balance),
                currency: acc.currency ?? 'UYU',
            },
        });
    };

    const handleEditAccount = (acc) => {
        router.push({
            pathname: '/add-account',
            params: {
                id: acc.id, name: acc.name, type: acc.type,
                icon: acc.icon, color: acc.color,
                balance: String(acc.balance),
                currency: acc.currency ?? 'UYU',
                include_in_total: String(acc.include_in_total !== false),
            },
        });
    };

    return (
        <FrostBackground edges={['top']}>
            {/* Header */}
            <View className="px-5 pt-2 pb-3">
                <Text className="text-xl font-bold text-stone-900 dark:text-white">Mas</Text>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#137fec" colors={['#137fec']} />
                }
            >
                {/* Accounts section */}
                <FadeIn delay={50}>
                <View className="px-5 pt-2 pb-5">
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">
                            Cuentas ({accounts.length})
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.push('/add-account')}
                            className="flex-row items-center gap-1"
                        >
                            <MaterialIcons name="add" size={16} color="#137fec" />
                            <Text className="text-xs font-bold text-primary">Nueva</Text>
                        </TouchableOpacity>
                    </View>

                    {accsLoading && !refreshing ? (
                        <SkeletonLoader.Card lines={3} />
                    ) : accounts.length === 0 ? (
                        <TouchableOpacity
                            onPress={() => router.push('/add-account')}
                            className="p-6 rounded-2xl border border-dashed border-stone-300 dark:border-slate-700 items-center"
                        >
                            <MaterialIcons name="account-balance-wallet" size={24} color="#a8a29e" />
                            <Text className="text-sm text-stone-400 mt-2">Agrega tu primera cuenta</Text>
                        </TouchableOpacity>
                    ) : (
                        <View className="bg-white/75 dark:bg-surface-dark rounded-2xl overflow-hidden border border-white/60 dark:border-slate-800 shadow-sm">
                            {accounts.map((acc, i) => {
                                const style = getCategoryStyle(acc.color);
                                return (
                                    <TouchableOpacity
                                        key={acc.id}
                                        onPress={() => handleViewAccount(acc)}
                                        onLongPress={() => handleDeleteAccount(acc)}
                                        activeOpacity={0.7}
                                        className={`flex-row items-center gap-3 px-4 py-3.5 ${i < accounts.length - 1 ? 'border-b border-stone-50 dark:border-slate-800' : ''}`}
                                    >
                                        <View className={`h-9 w-9 rounded-xl items-center justify-center ${style.bg}`}>
                                            <MaterialIcons name={acc.icon || 'account-balance-wallet'} size={18} color={style.hex} />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-sm font-semibold text-stone-800 dark:text-white">{acc.name}</Text>
                                            <Text className="text-xs text-stone-400">{ACCOUNT_TYPE_LABELS[acc.type] ?? acc.type}</Text>
                                        </View>
                                        <Text className="text-sm font-bold text-stone-800 dark:text-white">
                                            {formatCurrency(acc.balance, acc.currency ?? 'UYU')}
                                        </Text>
                                        <MaterialIcons name="chevron-right" size={18} color="#d6d3d1" />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>
                </FadeIn>

                {/* Tools */}
                <FadeIn delay={150}>
                <View className="px-5 pb-5">
                    <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500 mb-3">Herramientas</Text>
                    <View className="bg-white/75 dark:bg-surface-dark rounded-2xl overflow-hidden border border-white/60 dark:border-slate-800 shadow-sm">
                        <TouchableOpacity
                            onPress={() => router.push('/recurring')}
                            className="flex-row items-center gap-3 px-4 py-3.5 border-b border-stone-50 dark:border-slate-800"
                        >
                            <View className="h-9 w-9 rounded-xl bg-primary/10 items-center justify-center">
                                <MaterialIcons name="repeat" size={18} color="#137fec" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-sm font-semibold text-stone-800 dark:text-white">Gastos Recurrentes</Text>
                                <Text className="text-xs text-stone-400">Alquiler, servicios, suscripciones</Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={18} color="#d6d3d1" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => router.push('/planning')}
                            className="flex-row items-center gap-3 px-4 py-3.5"
                        >
                            <View className="h-9 w-9 rounded-xl bg-emerald-500/10 items-center justify-center">
                                <MaterialIcons name="trending-up" size={18} color="#10b981" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-sm font-semibold text-stone-800 dark:text-white">Revision del Mes</Text>
                                <Text className="text-xs text-stone-400">Analisis semanal y tendencias</Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={18} color="#d6d3d1" />
                        </TouchableOpacity>
                    </View>
                </View>
                </FadeIn>

                {/* Categories */}
                <FadeIn delay={250}>
                <View className="px-5 pb-5">
                    <View className="flex-row items-center justify-between mb-3">
                        <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">
                            Categorias de Gasto ({expenseCats.length})
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.push({ pathname: '/add-category', params: { type: 'expense' } })}
                            className="flex-row items-center gap-1"
                        >
                            <MaterialIcons name="add" size={16} color="#137fec" />
                            <Text className="text-xs font-bold text-primary">Nueva</Text>
                        </TouchableOpacity>
                    </View>

                    {catsLoading && !refreshing ? (
                        <SkeletonLoader.Card lines={4} />
                    ) : expenseCats.length === 0 ? (
                        <TouchableOpacity
                            onPress={() => router.push({ pathname: '/add-category', params: { type: 'expense' } })}
                            className="p-6 rounded-2xl border border-dashed border-stone-300 dark:border-slate-700 items-center"
                        >
                            <MaterialIcons name="category" size={24} color="#a8a29e" />
                            <Text className="text-sm text-stone-400 mt-2">Crea tu primera categoria</Text>
                        </TouchableOpacity>
                    ) : (
                        <View className="bg-white/75 dark:bg-surface-dark rounded-2xl overflow-hidden border border-white/60 dark:border-slate-800 shadow-sm">
                            {expenseCats.map((cat, i) => {
                                const style = getCategoryStyle(cat.color);
                                return (
                                    <TouchableOpacity
                                        key={cat.id}
                                        onPress={() => handleEditCategory(cat)}
                                        onLongPress={() => handleDeleteCategory(cat)}
                                        activeOpacity={0.7}
                                        className={`flex-row items-center gap-3 px-4 py-3 ${i < expenseCats.length - 1 ? 'border-b border-stone-50 dark:border-slate-800' : ''}`}
                                    >
                                        <View className={`h-8 w-8 rounded-lg items-center justify-center ${style.bg}`}>
                                            <MaterialIcons name={cat.icon} size={16} color={style.hex} />
                                        </View>
                                        <Text className="flex-1 text-sm font-medium text-stone-700 dark:text-white">{cat.name}</Text>
                                        <MaterialIcons name="chevron-right" size={18} color="#d6d3d1" />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>
                </FadeIn>

                {/* Income categories */}
                {incomeCats.length > 0 && (
                    <View className="px-5 pb-5">
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500">
                                Categorias de Ingreso ({incomeCats.length})
                            </Text>
                            <TouchableOpacity
                                onPress={() => router.push({ pathname: '/add-category', params: { type: 'income' } })}
                                className="flex-row items-center gap-1"
                            >
                                <MaterialIcons name="add" size={16} color="#137fec" />
                                <Text className="text-xs font-bold text-primary">Nueva</Text>
                            </TouchableOpacity>
                        </View>
                        <View className="bg-white/75 dark:bg-surface-dark rounded-2xl overflow-hidden border border-white/60 dark:border-slate-800 shadow-sm">
                            {incomeCats.map((cat, i) => {
                                const style = getCategoryStyle(cat.color);
                                return (
                                    <TouchableOpacity
                                        key={cat.id}
                                        onPress={() => handleEditCategory(cat)}
                                        onLongPress={() => handleDeleteCategory(cat)}
                                        activeOpacity={0.7}
                                        className={`flex-row items-center gap-3 px-4 py-3 ${i < incomeCats.length - 1 ? 'border-b border-stone-50 dark:border-slate-800' : ''}`}
                                    >
                                        <View className={`h-8 w-8 rounded-lg items-center justify-center ${style.bg}`}>
                                            <MaterialIcons name={cat.icon} size={16} color={style.hex} />
                                        </View>
                                        <Text className="flex-1 text-sm font-medium text-stone-700 dark:text-white">{cat.name}</Text>
                                        <MaterialIcons name="chevron-right" size={18} color="#d6d3d1" />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Profile & Preferences */}
                <FadeIn delay={350}>
                <View className="px-5 pb-5">
                    <Text className="text-xs font-semibold uppercase tracking-wider text-stone-400 dark:text-slate-500 mb-3">Perfil</Text>
                    <View className="bg-white/75 dark:bg-surface-dark rounded-2xl overflow-hidden border border-white/60 dark:border-slate-800 shadow-sm">
                        <TouchableOpacity
                            onPress={() => router.push('/profile')}
                            className="flex-row items-center gap-3 px-4 py-3.5"
                        >
                            <View className="h-9 w-9 rounded-xl bg-frost dark:bg-slate-800 items-center justify-center">
                                <MaterialIcons name="person" size={18} color="#64748b" />
                            </View>
                            <Text className="flex-1 text-sm font-semibold text-stone-800 dark:text-white">Mi Perfil</Text>
                            <MaterialIcons name="chevron-right" size={18} color="#d6d3d1" />
                        </TouchableOpacity>
                    </View>
                </View>
                </FadeIn>
            </ScrollView>
            {ToastComponent}
        </FrostBackground>
    );
}
