import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { showError } from '../src/lib/friendlyError';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { createGoal, updateGoal } from '../src/services/savingsGoalsService';
import { emitSavingsGoalsChange } from '../src/lib/events';
import { CATEGORY_COLORS, getCategoryStyle, getCurrencySymbol } from '../src/lib/helpers';

const ICON_OPTIONS = [
    'flag', 'savings', 'flight', 'home', 'school', 'directions-car',
    'shopping-bag', 'favorite', 'fitness-center', 'beach-access', 'laptop', 'star',
];

const COLOR_KEYS = Object.keys(CATEGORY_COLORS).filter(k => k !== 'slate');

export default function AddGoalScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const isEditing = !!params.id;
    const accountId = params.account_id;
    const accountCurrency = params.currency || 'UYU';

    const [name, setName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [deadline, setDeadline] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('flag');
    const [selectedColor, setSelectedColor] = useState('primary');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isEditing) {
            setName(typeof params.name === 'string' ? params.name : '');
            setTargetAmount(typeof params.target_amount === 'string' ? params.target_amount : '');
            setDeadline(typeof params.deadline === 'string' ? params.deadline : '');
            setSelectedIcon(typeof params.icon === 'string' ? params.icon : 'flag');
            setSelectedColor(typeof params.color === 'string' ? params.color : 'primary');
        }
    }, [isEditing]);

    const handleSubmit = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Ingresa un nombre para la meta');
            return;
        }
        const amount = Number(targetAmount);
        if (!amount || amount <= 0) {
            Alert.alert('Error', 'El monto objetivo debe ser mayor a 0');
            return;
        }
        if (isEditing && params.current_amount) {
            const current = Number(params.current_amount);
            if (amount < current) {
                Alert.alert('Error', 'El objetivo no puede ser menor al monto actual');
                return;
            }
        }
        if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
            Alert.alert('Error', 'Formato de fecha invalido (YYYY-MM-DD)');
            return;
        }

        setSubmitting(true);
        try {
            if (isEditing && typeof params.id === 'string') {
                await updateGoal(params.id, {
                    name: name.trim(),
                    target_amount: amount,
                    deadline: deadline || null,
                    icon: selectedIcon,
                    color: selectedColor,
                });
            } else {
                await createGoal({
                    account_id: accountId,
                    name: name.trim(),
                    target_amount: amount,
                    currency: accountCurrency,
                    deadline: deadline || null,
                    icon: selectedIcon,
                    color: selectedColor,
                });
            }
            emitSavingsGoalsChange();
            router.back();
        } catch (e) {
            showError(e);
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
                <View className="h-1.5 w-12 rounded-full bg-stone-300 dark:bg-slate-600" />
            </View>

            <View className="flex-row items-center justify-between px-4 py-2">
                <TouchableOpacity onPress={() => router.back()}>
                    <Text className="text-primary font-medium text-base">Cancelar</Text>
                </TouchableOpacity>
                <Text className="text-base font-bold text-stone-900 dark:text-white">
                    {isEditing ? 'Editar Meta' : 'Nueva Meta'}
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
                    <View className={`h-16 w-16 rounded-2xl ${previewStyle.bgCircle} items-center justify-center`}>
                        <MaterialIcons name={selectedIcon} size={32} color={previewStyle.hex} />
                    </View>
                    <Text className="mt-2 text-base font-bold text-stone-900 dark:text-white">
                        {name || 'Nombre de la meta'}
                    </Text>
                </View>

                {/* Name */}
                <View className="px-6 mb-6">
                    <Text className="text-sm font-bold text-stone-900 dark:text-white mb-3">Nombre</Text>
                    <View className="bg-frost dark:bg-input-dark rounded-xl px-4 h-12 justify-center">
                        <TextInput
                            value={name}
                            onChangeText={setName}
                            placeholder="Ej: Viaje, Auto nuevo..."
                            placeholderTextColor="#a8a29e"
                            maxLength={100}
                            className="text-base text-stone-900 dark:text-white font-medium"
                        />
                    </View>
                </View>

                {/* Target amount */}
                <View className="px-6 mb-6">
                    <Text className="text-sm font-bold text-stone-900 dark:text-white mb-3">Monto Objetivo</Text>
                    <View className="bg-frost dark:bg-input-dark rounded-xl px-4 h-12 flex-row items-center">
                        <Text className="text-stone-500 text-base font-bold mr-2">{getCurrencySymbol(accountCurrency)}</Text>
                        <TextInput
                            value={targetAmount}
                            onChangeText={(v) => setTargetAmount(v.replace(/[^0-9.]/g, ''))}
                            placeholder="0.00"
                            placeholderTextColor="#a8a29e"
                            keyboardType="decimal-pad"
                            maxLength={15}
                            className="flex-1 text-base text-stone-900 dark:text-white font-medium"
                        />
                    </View>
                </View>

                {/* Deadline */}
                <View className="px-6 mb-6">
                    <Text className="text-sm font-bold text-stone-900 dark:text-white mb-3">Fecha limite (opcional)</Text>
                    <View className="bg-frost dark:bg-input-dark rounded-xl px-4 h-12 justify-center">
                        <TextInput
                            value={deadline}
                            onChangeText={setDeadline}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#a8a29e"
                            maxLength={10}
                            className="text-base text-stone-900 dark:text-white font-medium"
                        />
                    </View>
                </View>

                {/* Icon Grid */}
                <View className="px-6 mb-6">
                    <Text className="text-sm font-bold text-stone-900 dark:text-white mb-3">Icono</Text>
                    <View className="flex-row flex-wrap gap-3">
                        {ICON_OPTIONS.map((icon) => {
                            const isActive = selectedIcon === icon;
                            return (
                                <TouchableOpacity
                                    key={icon}
                                    onPress={() => setSelectedIcon(icon)}
                                    className={`h-12 w-12 rounded-xl items-center justify-center ${isActive ? 'bg-primary' : 'bg-frost dark:bg-input-dark'}`}
                                >
                                    <MaterialIcons name={icon} size={24} color={isActive ? 'white' : '#64748b'} />
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Color Grid */}
                <View className="px-6 mb-8">
                    <Text className="text-sm font-bold text-stone-900 dark:text-white mb-3">Color</Text>
                    <View className="flex-row flex-wrap gap-3">
                        {COLOR_KEYS.map((colorKey) => {
                            const style = getCategoryStyle(colorKey);
                            const isActive = selectedColor === colorKey;
                            return (
                                <TouchableOpacity
                                    key={colorKey}
                                    onPress={() => setSelectedColor(colorKey)}
                                    className={`h-12 w-12 rounded-xl items-center justify-center ${isActive ? 'border-2 border-stone-900 dark:border-white' : ''}`}
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
