/**
 * GESTION SCREEN — "Cuanto tengo? + Configuracion"
 *
 * LAYOUT:
 * ┌──────────────────────────────┐
 * │  Header: "Gestion"                │
 * ├──────────────────────────────┤
 * │  ACCOUNTS (prominent)             │
 * │  ┌ Pesos ────── $U 12,400 ─────┐ │
 * │  │ Credito                      │ │
 * │  ├──────────────────────────────┤ │
 * │  │ Dolares ──── US$ 500 ────── │ │
 * │  │ Ahorro                       │ │
 * │  └──────────────────────────────┘ │
 * │  [+ Nueva Cuenta]                 │
 * ├──────────────────────────────┤
 * │  SAVINGS GOALS (quick access)     │
 * │  → Links to goals screen          │
 * ├──────────────────────────────┤
 * │  TOOLS                            │
 * │  Recurrentes · Revision · etc     │
 * ├──────────────────────────────┤
 * │  CATEGORIES (collapsed)           │
 * │  ► Gasto (11) · ► Ingreso (2)    │
 * ├──────────────────────────────┤
 * │  PROFILE                          │
 * └──────────────────────────────┘
 *
 * KEY CHANGES:
 * - Renamed from "Mas" to "Gestion"
 * - Accounts section more prominent with balances
 * - Savings goals visible here (quick link)
 * - Categories sections collapsed by default (expand on tap)
 * - Cleaner visual hierarchy
 */
import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { showError } from '../../src/lib/friendlyError';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useMemo, useCallback } from 'react';
import { SkeletonLoader, useToast, FadeIn, ScalePress, FrostBackground, EmptyState } from '../../components/ui';
import { useCategories } from '../../src/hooks/useCategories';
import { useAccounts } from '../../src/hooks/useAccounts';
import { useSavingsGoals } from '../../src/hooks/useSavingsGoals';
import { deleteCategory } from '../../src/services/categoriesService';
import { deleteAccount } from '../../src/services/accountsService';
import { emitCategoriesChange, emitAccountsChange } from '../../src/lib/events';
import { getCategoryStyle, formatCurrency } from '../../src/lib/helpers';
import { useAccountContext } from '../../src/context/AccountContext';
import { goalProgress } from '../../src/lib/goalHelpers';

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
    const { selectAccount } = useAccountContext();
    const { goals: activeGoals } = useSavingsGoals();
    const { show: showToast, ToastComponent } = useToast();
    const [refreshing, setRefreshing] = useState(false);
    const [expenseCatsExpanded, setExpenseCatsExpanded] = useState(false);
    const [incomeCatsExpanded, setIncomeCatsExpanded] = useState(false);

    const expenseCats = categories.filter(c => c.type === 'expense');
    const incomeCats = categories.filter(c => c.type === 'income');

    const totalGoalProgress = useMemo(() => {
        if (activeGoals.length === 0) return 0;
        return Math.round(activeGoals.reduce((s, g) => s + goalProgress(g), 0) / activeGoals.length);
    }, [activeGoals]);

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

    return (
        <FrostBackground edges={['top']}>
            <View className="px-5 pt-2 pb-3">
                <Text className="text-xl font-bold text-slate-900 dark:text-white">Gestion</Text>
            </View>

            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" colors={['#6366F1']} />
                }
            >
                {/* ============ ACCOUNTS (prominent) ============ */}
                <FadeIn delay={50}>
                    <View className="px-5 pt-2 pb-5">
                        <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                Cuentas ({accounts.length})
                            </Text>
                            <TouchableOpacity
                                onPress={() => router.push('/add-account')}
                                className="flex-row items-center gap-1"
                            >
                                <MaterialIcons name="add" size={16} color="#6366F1" />
                                <Text className="text-xs font-bold text-primary">Nueva</Text>
                            </TouchableOpacity>
                        </View>

                        {accsLoading && !refreshing ? (
                            <SkeletonLoader.Card lines={3} />
                        ) : accounts.length === 0 ? (
                            <EmptyState
                                icon="account-balance-wallet"
                                title="Sin cuentas"
                                subtitle="Agrega tu primera cuenta para empezar"
                                actionLabel="Nueva Cuenta"
                                onAction={() => router.push('/add-account')}
                                compact
                            />
                        ) : (
                            <View className="bg-white dark:bg-card-dark rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                                {accounts.map((acc, i) => {
                                    const style = getCategoryStyle(acc.color);
                                    return (
                                        <TouchableOpacity
                                            key={acc.id}
                                            onPress={() => handleViewAccount(acc)}
                                            onLongPress={() => handleDeleteAccount(acc)}
                                            activeOpacity={0.7}
                                            className={`flex-row items-center gap-3 px-4 py-3.5 ${i < accounts.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}
                                        >
                                            <View className={`h-10 w-10 rounded-xl items-center justify-center ${style.bg}`}>
                                                <MaterialIcons name={acc.icon || 'account-balance-wallet'} size={18} color={style.hex} />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-sm font-bold text-slate-800 dark:text-white">{acc.name}</Text>
                                                <Text className="text-xs text-slate-400">{ACCOUNT_TYPE_LABELS[acc.type] ?? acc.type}</Text>
                                            </View>
                                            <Text className="text-sm font-extrabold text-slate-900 dark:text-white">
                                                {formatCurrency(acc.balance, acc.currency ?? 'UYU')}
                                            </Text>
                                            <MaterialIcons name="chevron-right" size={18} color="#CBD5E1" />
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                </FadeIn>

                {/* ============ SAVINGS GOALS (quick access) ============ */}
                {activeGoals.length > 0 && (
                    <FadeIn delay={100}>
                        <View className="px-5 pb-5">
                            <ScalePress onPress={() => router.push('/(tabs)/goals')}>
                                <View className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 flex-row items-center gap-3">
                                    <View className="h-10 w-10 rounded-xl bg-primary-faint dark:bg-primary/10 items-center justify-center">
                                        <MaterialIcons name="flag" size={20} color="#6366F1" />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-sm font-bold text-slate-800 dark:text-white">
                                            {activeGoals.length} meta{activeGoals.length !== 1 ? 's' : ''} activa{activeGoals.length !== 1 ? 's' : ''}
                                        </Text>
                                        <Text className="text-xs text-slate-400 mt-0.5">
                                            Progreso promedio: {totalGoalProgress}%
                                        </Text>
                                    </View>
                                    <MaterialIcons name="chevron-right" size={18} color="#CBD5E1" />
                                </View>
                            </ScalePress>
                        </View>
                    </FadeIn>
                )}

                {/* ============ TOOLS ============ */}
                <FadeIn delay={150}>
                    <View className="px-5 pb-5">
                        <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Herramientas</Text>
                        <View className="bg-white dark:bg-card-dark rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                            {[
                                { icon: 'repeat', color: 'bg-primary-faint dark:bg-primary/10', iconColor: '#6366F1', label: 'Gastos Recurrentes', sub: 'Alquiler, servicios, suscripciones', route: '/recurring' },
                                { icon: 'trending-up', color: 'bg-emerald-50 dark:bg-emerald-500/10', iconColor: '#10b981', label: 'Revision del Mes', sub: 'Analisis semanal y tendencias', route: '/planning' },
                                { icon: 'insights', color: 'bg-purple-50 dark:bg-purple-500/10', iconColor: '#9333ea', label: 'Analisis Financiero', sub: 'Graficos, tendencias y comparativas', route: '/analytics' },
                                { icon: 'widgets', color: 'bg-amber-50 dark:bg-amber-500/10', iconColor: '#f59e0b', label: 'Widgets', sub: 'Configura widgets de pantalla', route: '/widget-settings' },
                            ].map((tool, i, arr) => (
                                <TouchableOpacity
                                    key={tool.route}
                                    onPress={() => router.push(tool.route)}
                                    className={`flex-row items-center gap-3 px-4 py-3.5 ${i < arr.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''}`}
                                >
                                    <View className={`h-9 w-9 rounded-xl ${tool.color} items-center justify-center`}>
                                        <MaterialIcons name={tool.icon} size={18} color={tool.iconColor} />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-sm font-semibold text-slate-800 dark:text-white">{tool.label}</Text>
                                        <Text className="text-xs text-slate-400">{tool.sub}</Text>
                                    </View>
                                    <MaterialIcons name="chevron-right" size={18} color="#CBD5E1" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </FadeIn>

                {/* ============ CATEGORIES (collapsed) ============ */}
                <FadeIn delay={250}>
                    <View className="px-5 pb-5">
                        <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Categorias</Text>

                        {catsLoading && !refreshing ? (
                            <SkeletonLoader.Card lines={3} />
                        ) : (
                            <View className="gap-3">
                                {/* Expense categories — collapsed */}
                                <View className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                                    <TouchableOpacity
                                        onPress={() => setExpenseCatsExpanded(!expenseCatsExpanded)}
                                        className="flex-row items-center justify-between px-4 py-3.5"
                                    >
                                        <View className="flex-row items-center gap-3">
                                            <View className="h-8 w-8 rounded-lg bg-red-50 dark:bg-red-500/10 items-center justify-center">
                                                <MaterialIcons name="arrow-downward" size={14} color="#EF4444" />
                                            </View>
                                            <Text className="text-sm font-semibold text-slate-800 dark:text-white">
                                                Gastos ({expenseCats.length})
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center gap-2">
                                            <TouchableOpacity
                                                onPress={() => router.push({ pathname: '/add-category', params: { type: 'expense' } })}
                                                hitSlop={8}
                                            >
                                                <MaterialIcons name="add" size={20} color="#6366F1" />
                                            </TouchableOpacity>
                                            <MaterialIcons
                                                name={expenseCatsExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                                                size={20}
                                                color="#94A3B8"
                                            />
                                        </View>
                                    </TouchableOpacity>

                                    {expenseCatsExpanded && expenseCats.map((cat, i) => {
                                        const style = getCategoryStyle(cat.color);
                                        return (
                                            <TouchableOpacity
                                                key={cat.id}
                                                onPress={() => handleEditCategory(cat)}
                                                onLongPress={() => handleDeleteCategory(cat)}
                                                activeOpacity={0.7}
                                                className={`flex-row items-center gap-3 px-4 py-3 border-t border-slate-100 dark:border-slate-800`}
                                            >
                                                <View className={`h-8 w-8 rounded-lg items-center justify-center ${style.bg}`}>
                                                    <MaterialIcons name={cat.icon} size={16} color={style.hex} />
                                                </View>
                                                <Text className="flex-1 text-sm font-medium text-slate-700 dark:text-white">{cat.name}</Text>
                                                <MaterialIcons name="chevron-right" size={18} color="#CBD5E1" />
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>

                                {/* Income categories — collapsed */}
                                {incomeCats.length > 0 && (
                                    <View className="bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                                        <TouchableOpacity
                                            onPress={() => setIncomeCatsExpanded(!incomeCatsExpanded)}
                                            className="flex-row items-center justify-between px-4 py-3.5"
                                        >
                                            <View className="flex-row items-center gap-3">
                                                <View className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 items-center justify-center">
                                                    <MaterialIcons name="arrow-upward" size={14} color="#10B981" />
                                                </View>
                                                <Text className="text-sm font-semibold text-slate-800 dark:text-white">
                                                    Ingresos ({incomeCats.length})
                                                </Text>
                                            </View>
                                            <View className="flex-row items-center gap-2">
                                                <TouchableOpacity
                                                    onPress={() => router.push({ pathname: '/add-category', params: { type: 'income' } })}
                                                    hitSlop={8}
                                                >
                                                    <MaterialIcons name="add" size={20} color="#6366F1" />
                                                </TouchableOpacity>
                                                <MaterialIcons
                                                    name={incomeCatsExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                                                    size={20}
                                                    color="#94A3B8"
                                                />
                                            </View>
                                        </TouchableOpacity>

                                        {incomeCatsExpanded && incomeCats.map((cat) => {
                                            const style = getCategoryStyle(cat.color);
                                            return (
                                                <TouchableOpacity
                                                    key={cat.id}
                                                    onPress={() => handleEditCategory(cat)}
                                                    onLongPress={() => handleDeleteCategory(cat)}
                                                    activeOpacity={0.7}
                                                    className="flex-row items-center gap-3 px-4 py-3 border-t border-slate-100 dark:border-slate-800"
                                                >
                                                    <View className={`h-8 w-8 rounded-lg items-center justify-center ${style.bg}`}>
                                                        <MaterialIcons name={cat.icon} size={16} color={style.hex} />
                                                    </View>
                                                    <Text className="flex-1 text-sm font-medium text-slate-700 dark:text-white">{cat.name}</Text>
                                                    <MaterialIcons name="chevron-right" size={18} color="#CBD5E1" />
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                </FadeIn>

                {/* ============ PROFILE ============ */}
                <FadeIn delay={350}>
                    <View className="px-5 pb-5">
                        <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">Perfil</Text>
                        <View className="bg-white dark:bg-card-dark rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                            <TouchableOpacity
                                onPress={() => router.push('/profile')}
                                className="flex-row items-center gap-3 px-4 py-3.5"
                            >
                                <View className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center">
                                    <MaterialIcons name="person" size={18} color="#64748b" />
                                </View>
                                <Text className="flex-1 text-sm font-semibold text-slate-800 dark:text-white">Mi Perfil</Text>
                                <MaterialIcons name="chevron-right" size={18} color="#CBD5E1" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </FadeIn>
            </ScrollView>
            {ToastComponent}
        </FrostBackground>
    );
}
