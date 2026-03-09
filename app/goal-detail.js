import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, ActivityIndicator, Platform } from 'react-native';
import { showError } from '../src/lib/friendlyError';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useCallback } from 'react';
import { AnimatedProgressBar, FadeIn } from '../components/ui';
import ConfirmModal from '../components/ConfirmModal';
import { getGoal, addContribution, removeContribution, pauseGoal, resumeGoal, completeGoal, deleteGoal } from '../src/services/savingsGoalsService';
import { emitSavingsGoalsChange } from '../src/lib/events';
import { useGoalContributions } from '../src/hooks/useSavingsGoals';
import { onSavingsGoalsChange } from '../src/lib/events';
import { formatCurrency, getCategoryStyle } from '../src/lib/helpers';
import {
    goalProgress, goalRemaining, goalPaceStatus, paceLabel,
    goalRequiredRate, goalProjectedDate, avgMonthlyContribution,
    formatTimeRemaining, goalStatusLabel
} from '../src/lib/goalHelpers';

export default function GoalDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const goalId = params.id;

    const [goal, setGoal] = useState(null);
    const [loading, setLoading] = useState(true);
    const { contributions, loading: contribLoading } = useGoalContributions(goalId);

    // Contribution modal
    const [showContribModal, setShowContribModal] = useState(false);
    const [contribAmount, setContribAmount] = useState('');
    const [contribNote, setContribNote] = useState('');
    const [contribSubmitting, setContribSubmitting] = useState(false);

    // Delete confirm
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteContribId, setDeleteContribId] = useState(null);

    const loadGoal = useCallback(async () => {
        if (!goalId) return;
        try {
            const data = await getGoal(goalId);
            setGoal(data);
        } catch (e) {
            if (__DEV__) console.log('Load goal error:', e.message);
        } finally {
            setLoading(false);
        }
    }, [goalId]);

    useEffect(() => {
        // Use pass-through params for instant display
        if (params.name) {
            setGoal({
                id: goalId,
                name: params.name,
                target_amount: Number(params.target_amount) || 0,
                current_amount: Number(params.current_amount) || 0,
                currency: params.currency || 'UYU',
                deadline: params.deadline || null,
                status: params.status || 'active',
                icon: params.icon || 'flag',
                color: params.color || 'primary',
                priority: Number(params.priority) || 0,
                created_at: params.created_at || new Date().toISOString(),
            });
            setLoading(false);
        }
        loadGoal();
    }, [loadGoal]);

    useEffect(() => {
        return onSavingsGoalsChange(() => {
            loadGoal();
        });
    }, [loadGoal]);

    const handleAddContribution = async () => {
        const amount = Number(contribAmount);
        if (!amount || amount <= 0) return;

        setContribSubmitting(true);
        try {
            await addContribution(goalId, amount, contribNote.trim() || undefined);
            setShowContribModal(false);
            setContribAmount('');
            setContribNote('');
        } catch (e) {
            showError(e);
        } finally {
            setContribSubmitting(false);
        }
    };

    const handleRemoveContribution = async () => {
        if (!deleteContribId) return;
        try {
            await removeContribution(deleteContribId);
        } catch (e) {
            showError(e);
        } finally {
            setDeleteContribId(null);
        }
    };

    const handlePauseResume = async () => {
        if (!goal) return;
        try {
            if (goal.status === 'active') {
                await pauseGoal(goalId);
            } else {
                await resumeGoal(goalId);
            }
            emitSavingsGoalsChange();
        } catch (e) {
            showError(e);
        }
    };

    const handleComplete = async () => {
        try {
            await completeGoal(goalId);
            emitSavingsGoalsChange();
        } catch (e) {
            showError(e);
        }
    };

    const handleDelete = async () => {
        try {
            await deleteGoal(goalId);
            emitSavingsGoalsChange();
            router.back();
        } catch (e) {
            showError(e);
        } finally {
            setShowDeleteConfirm(false);
        }
    };

    if (loading || !goal) {
        return (
            <View className="flex-1 bg-background-light dark:bg-background-dark items-center justify-center">
                <ActivityIndicator size="large" color="#6366F1" />
            </View>
        );
    }

    const pct = goalProgress(goal);
    const remaining = goalRemaining(goal);
    const pace = goalPaceStatus(goal);
    const pLabel = paceLabel(pace);
    const required = goalRequiredRate(goal);
    const projected = goalProjectedDate(goal, contributions);
    const avgMonthly = avgMonthlyContribution(goal, contributions);
    const style = getCategoryStyle(goal.color);
    const isActive = goal.status === 'active';
    const isPaused = goal.status === 'paused';

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="px-4 pt-4 pb-4 bg-background-light/80 dark:bg-background-dark/80 border-b border-white/40 dark:border-slate-800 z-10">
                <SafeAreaView edges={['top']} className="flex-row items-center justify-between h-12">
                    <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full active:bg-stone-200 dark:active:bg-slate-800">
                        <MaterialIcons name="arrow-back-ios-new" size={20} color="#475569" />
                    </TouchableOpacity>
                    <Text className="text-lg font-bold text-stone-900 dark:text-white">Detalle de Meta</Text>
                    {isActive && (
                        <TouchableOpacity
                            onPress={() => router.push({
                                pathname: '/add-goal',
                                params: {
                                    id: goal.id,
                                    account_id: goal.account_id,
                                    currency: goal.currency,
                                    name: goal.name,
                                    target_amount: String(goal.target_amount),
                                    current_amount: String(goal.current_amount),
                                    deadline: goal.deadline || '',
                                    icon: goal.icon,
                                    color: goal.color,
                                },
                            })}
                            className="h-10 w-10 items-center justify-center rounded-full active:bg-stone-200 dark:active:bg-slate-800"
                        >
                            <MaterialIcons name="edit" size={20} color="#6366F1" />
                        </TouchableOpacity>
                    )}
                    {!isActive && <View className="h-10 w-10" />}
                </SafeAreaView>
            </View>

            <ScrollView className="flex-1 px-5 py-6">
                <View className="space-y-6 pb-32">
                    {/* Hero */}
                    <FadeIn delay={100}>
                        <View className="items-center">
                            <View className={`h-20 w-20 rounded-3xl items-center justify-center ${style.bg}`}>
                                <MaterialIcons name={goal.icon || 'flag'} size={40} color={style.hex} />
                            </View>
                            <Text className="text-xl font-bold text-stone-900 dark:text-white mt-3">{goal.name}</Text>
                            {!isActive && (
                                <View className="mt-2 px-3 py-1 rounded-full" style={{ backgroundColor: goal.status === 'completed' ? '#10b98115' : '#64748b15' }}>
                                    <Text className="text-xs font-bold" style={{ color: goal.status === 'completed' ? '#10b981' : '#64748b' }}>
                                        {goalStatusLabel(goal.status)}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </FadeIn>

                    {/* Progress card */}
                    <FadeIn delay={200}>
                        <View className="bg-white/75 dark:bg-card-dark p-5 rounded-2xl border border-white/60 dark:border-slate-800 shadow-md">
                            <View className="flex-row justify-between mb-2">
                                <Text className="text-base font-bold text-stone-900 dark:text-white">
                                    {formatCurrency(goal.current_amount, goal.currency)}
                                </Text>
                                <Text className="text-base font-semibold text-stone-400">
                                    / {formatCurrency(goal.target_amount, goal.currency)}
                                </Text>
                            </View>
                            <AnimatedProgressBar
                                percentage={pct}
                                color={style.hex}
                                height={8}
                                delay={300}
                            />
                            <Text className="text-xs font-bold text-stone-500 dark:text-slate-400 mt-2 text-right">
                                {Math.round(pct)}%
                            </Text>
                        </View>
                    </FadeIn>

                    {/* Stats row */}
                    <FadeIn delay={300}>
                        <View className="flex-row gap-3">
                            <View className="flex-1 bg-white/75 dark:bg-card-dark p-4 rounded-2xl border border-white/60 dark:border-slate-800 shadow-sm">
                                <Text className="text-xs font-semibold text-stone-400 mb-1">Restante</Text>
                                <Text className="text-base font-bold text-stone-900 dark:text-white">
                                    {formatCurrency(remaining, goal.currency)}
                                </Text>
                            </View>
                            <View className="flex-1 bg-white/75 dark:bg-card-dark p-4 rounded-2xl border border-white/60 dark:border-slate-800 shadow-sm">
                                {goal.deadline ? (
                                    <>
                                        <View className="flex-row items-center justify-between mb-1">
                                            <Text className="text-xs font-semibold text-stone-400">Ritmo/mes</Text>
                                            <View className="px-1.5 py-0.5 rounded-full" style={{ backgroundColor: pLabel.color + '15' }}>
                                                <Text className="text-[10px] font-bold" style={{ color: pLabel.color }}>{pLabel.text}</Text>
                                            </View>
                                        </View>
                                        <Text className="text-base font-bold text-stone-900 dark:text-white">
                                            {required ? formatCurrency(required.monthly, goal.currency) : '-'}
                                        </Text>
                                        <Text className="text-xs text-stone-400 mt-0.5">
                                            {formatTimeRemaining(goal.deadline)}
                                        </Text>
                                    </>
                                ) : (
                                    <>
                                        <Text className="text-xs font-semibold text-stone-400 mb-1">Prom. mensual</Text>
                                        <Text className="text-base font-bold text-stone-900 dark:text-white">
                                            {avgMonthly > 0 ? formatCurrency(avgMonthly, goal.currency) : '-'}
                                        </Text>
                                        {projected && (
                                            <Text className="text-xs text-stone-400 mt-0.5">
                                                Est. {projected.toLocaleDateString('es-UY', { month: 'short', year: 'numeric' })}
                                            </Text>
                                        )}
                                    </>
                                )}
                            </View>
                        </View>
                    </FadeIn>

                    {/* Contributions section */}
                    <FadeIn delay={400}>
                        <View>
                            <View className="flex-row items-center justify-between mb-3">
                                <Text className="text-sm font-bold text-stone-900 dark:text-white">Aportes</Text>
                                <View className="bg-frost dark:bg-slate-800 h-5 min-w-[20px] items-center justify-center rounded-full px-1.5">
                                    <Text className="text-xs font-bold text-stone-500 dark:text-slate-400">{contributions.length}</Text>
                                </View>
                            </View>

                            {contribLoading && <ActivityIndicator size="small" color="#6366F1" />}

                            {!contribLoading && contributions.length === 0 && (
                                <View className="items-center py-8">
                                    <MaterialIcons name="account-balance-wallet" size={36} color="#d6d3d1" />
                                    <Text className="text-stone-400 text-sm font-medium mt-3">Sin aportes aun</Text>
                                </View>
                            )}

                            <View className="gap-2">
                                {contributions.map((c) => (
                                    <View key={c.id} className="bg-white/75 dark:bg-card-dark px-4 py-3 rounded-xl border border-white/60 dark:border-slate-800 flex-row items-center">
                                        <View className="flex-1">
                                            <Text className="text-sm font-bold text-emerald-500">
                                                +{formatCurrency(c.amount, goal.currency)}
                                            </Text>
                                            {c.note && (
                                                <Text className="text-xs text-stone-400 mt-0.5" numberOfLines={1}>{c.note}</Text>
                                            )}
                                            <Text className="text-xs text-stone-300 dark:text-slate-600 mt-0.5">
                                                {new Date(c.created_at).toLocaleDateString('es-UY', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => setDeleteContribId(c.id)}
                                            className="h-8 w-8 items-center justify-center rounded-full active:bg-red-100 dark:active:bg-red-500/20"
                                        >
                                            <MaterialIcons name="close" size={16} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </FadeIn>

                    {/* Actions */}
                    {(isActive || isPaused) && (
                        <FadeIn delay={500}>
                            <View className="gap-2">
                                <TouchableOpacity
                                    onPress={handlePauseResume}
                                    className="flex-row items-center justify-center gap-2 py-3.5 rounded-xl bg-frost dark:bg-input-dark"
                                >
                                    <MaterialIcons name={isActive ? 'pause' : 'play-arrow'} size={20} color="#64748b" />
                                    <Text className="text-sm font-bold text-stone-600 dark:text-slate-300">
                                        {isActive ? 'Pausar Meta' : 'Reanudar Meta'}
                                    </Text>
                                </TouchableOpacity>

                                {isActive && (
                                    <TouchableOpacity
                                        onPress={handleComplete}
                                        className="flex-row items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10"
                                    >
                                        <MaterialIcons name="check-circle" size={20} color="#10b981" />
                                        <Text className="text-sm font-bold text-emerald-600">Completar Meta</Text>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity
                                    onPress={() => setShowDeleteConfirm(true)}
                                    className="flex-row items-center justify-center gap-2 py-3.5 rounded-xl bg-red-50 dark:bg-red-500/10"
                                >
                                    <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
                                    <Text className="text-sm font-bold text-red-500">Eliminar Meta</Text>
                                </TouchableOpacity>
                            </View>
                        </FadeIn>
                    )}
                </View>
            </ScrollView>

            {/* Bottom: Add contribution button */}
            {isActive && (
                <View className="p-5 bg-background-light dark:bg-background-dark border-t border-white/40 dark:border-slate-800">
                    <SafeAreaView edges={['bottom']}>
                        <TouchableOpacity
                            onPress={() => setShowContribModal(true)}
                            className="w-full py-4 rounded-xl bg-primary active:opacity-90 shadow-sm"
                            style={{ shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 }}
                        >
                            <Text className="text-white font-bold text-center text-base">Agregar Aporte</Text>
                        </TouchableOpacity>
                    </SafeAreaView>
                </View>
            )}

            {/* Contribution modal */}
            <Modal visible={showContribModal} transparent animationType="fade">
                <View className="flex-1 bg-black/50 items-center justify-center px-6">
                    <View className="w-full bg-white dark:bg-surface-dark rounded-2xl overflow-hidden">
                        <View className="p-6">
                            <Text className="text-lg font-bold text-stone-900 dark:text-white text-center mb-1">Nuevo Aporte</Text>
                            <Text className="text-xs text-stone-400 text-center mb-5">
                                Restante: {formatCurrency(remaining, goal.currency)}
                            </Text>

                            <Text className="text-sm font-bold text-stone-900 dark:text-white mb-2">Monto</Text>
                            <View className="bg-frost dark:bg-input-dark rounded-xl px-4 h-12 flex-row items-center mb-4">
                                <Text className="text-stone-500 text-base font-bold mr-2">{goal.currency === 'USD' ? 'US$' : goal.currency === 'EUR' ? 'E' : '$U'}</Text>
                                <TextInput
                                    value={contribAmount}
                                    onChangeText={(v) => setContribAmount(v.replace(/[^0-9.]/g, ''))}
                                    placeholder="0.00"
                                    placeholderTextColor="#a8a29e"
                                    keyboardType="decimal-pad"
                                    maxLength={15}
                                    autoFocus
                                    className="flex-1 text-base text-stone-900 dark:text-white font-medium"
                                />
                            </View>

                            <Text className="text-sm font-bold text-stone-900 dark:text-white mb-2">Nota (opcional)</Text>
                            <View className="bg-frost dark:bg-input-dark rounded-xl px-4 h-12 justify-center mb-2">
                                <TextInput
                                    value={contribNote}
                                    onChangeText={setContribNote}
                                    placeholder="Ej: Ahorro del mes..."
                                    placeholderTextColor="#a8a29e"
                                    maxLength={200}
                                    className="text-base text-stone-900 dark:text-white font-medium"
                                />
                            </View>
                        </View>

                        <View className="flex-row border-t border-stone-100 dark:border-slate-700">
                            <TouchableOpacity
                                onPress={() => { setShowContribModal(false); setContribAmount(''); setContribNote(''); }}
                                className="flex-1 items-center border-r border-stone-100 dark:border-slate-700"
                                style={{ minHeight: 48, justifyContent: 'center' }}
                            >
                                <Text className="text-base font-semibold text-primary">Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleAddContribution}
                                disabled={contribSubmitting}
                                className="flex-1 items-center"
                                style={{ minHeight: 48, justifyContent: 'center' }}
                            >
                                {contribSubmitting ? (
                                    <ActivityIndicator size="small" color="#6366F1" />
                                ) : (
                                    <Text className="text-base font-bold text-primary">Confirmar</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Delete goal confirm */}
            <ConfirmModal
                visible={showDeleteConfirm}
                title="Eliminar meta"
                message={`¿Eliminar "${goal.name}"? Se eliminaran todos los aportes.`}
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />

            {/* Delete contribution confirm */}
            <ConfirmModal
                visible={!!deleteContribId}
                title="Eliminar aporte"
                message="¿Eliminar este aporte? El progreso se actualizara."
                onConfirm={handleRemoveContribution}
                onCancel={() => setDeleteContribId(null)}
            />
        </View>
    );
}
