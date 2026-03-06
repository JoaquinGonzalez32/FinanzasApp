import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { showError } from '../src/lib/friendlyError';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { createCategory, updateCategory } from '../src/services/categoriesService';
import { emitCategoriesChange } from '../src/lib/events';
import { CATEGORY_COLORS, getCategoryStyle } from '../src/lib/helpers';
import { useAccounts } from '../src/hooks/useAccounts';

const ICON_OPTIONS = [
    'restaurant', 'directions-car', 'shopping-bag', 'house',
    'medical-services', 'movie', 'school', 'fitness-center',
    'pets', 'phone-android', 'flight', 'local-cafe',
    'payments', 'computer', 'work', 'card-giftcard',
    'savings', 'trending-up', 'store', 'build',
];

const COLOR_KEYS = Object.keys(CATEGORY_COLORS).filter(k => k !== 'primary' && k !== 'slate');

export default function AddCategoryScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const isEditing = !!params.id;

    const getInitial = (key, fallback) => (typeof params[key] === 'string' ? params[key] : fallback);

    const [name, setName] = useState(isEditing ? getInitial('name', '') : '');
    const [type, setType] = useState(isEditing ? getInitial('catType', 'expense') : (params.type === 'income' ? 'income' : 'expense'));
    const [selectedIcon, setSelectedIcon] = useState(getInitial('icon', 'restaurant'));
    const [selectedColor, setSelectedColor] = useState(getInitial('color', 'orange'));
    const [selectedAccount, setSelectedAccount] = useState(getInitial('account_id', '') || null);
    const [submitting, setSubmitting] = useState(false);

    const { accounts } = useAccounts();

    useEffect(() => {
        if (isEditing) {
            setName(getInitial('name', ''));
            setType(getInitial('catType', 'expense'));
            setSelectedIcon(getInitial('icon', 'restaurant'));
            setSelectedColor(getInitial('color', 'orange'));
            setSelectedAccount(getInitial('account_id', '') || null);
        }
    }, [params.id]);

    const handleSubmit = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Ingresá un nombre para la categoría');
            return;
        }
        setSubmitting(true);
        try {
            if (isEditing && typeof params.id === 'string') {
                await updateCategory(params.id, {
                    name: name.trim(),
                    icon: selectedIcon,
                    color: selectedColor,
                    type,
                    account_id: selectedAccount,
                });
            } else {
                await createCategory({
                    name: name.trim(),
                    icon: selectedIcon,
                    color: selectedColor,
                    type,
                    sort_order: 99,
                    account_id: selectedAccount,
                    created_at: new Date().toISOString(),
                });
            }
            emitCategoriesChange();
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
                <View className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-[#3b4754]" />
            </View>

            <View className="flex-row items-center justify-between px-4 py-2">
                <TouchableOpacity onPress={() => router.back()}>
                    <Text className="text-primary font-medium text-base">Cancelar</Text>
                </TouchableOpacity>
                <Text className="text-base font-bold text-slate-900 dark:text-white">
                    {isEditing ? 'Editar Categoría' : 'Nueva Categoría'}
                </Text>
                <TouchableOpacity onPress={handleSubmit} disabled={submitting}>
                    <Text className={`text-primary font-bold text-base ${submitting ? 'opacity-50' : ''}`}>
                        {submitting ? 'Guardando' : isEditing ? 'Guardar' : 'Crear'}
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
                            placeholder="Ej: Comida, Gym..."
                            placeholderTextColor="#94a3b8"
                            maxLength={100}
                            className="text-base text-slate-900 dark:text-white font-medium"
                        />
                    </View>
                </View>

                {/* Type Toggle */}
                <View className="px-6 mb-6">
                    <Text className="text-slate-900 dark:text-white text-base font-bold mb-3">Tipo</Text>
                    <View className="flex-row h-12 w-full items-center justify-center rounded-xl bg-slate-100 dark:bg-input-dark p-1.5">
                        <TouchableOpacity
                            onPress={() => setType('expense')}
                            className={`flex-1 items-center justify-center rounded-lg h-full ${type === 'expense' ? 'bg-white dark:bg-modal-dark shadow-sm' : ''}`}
                        >
                            <Text className={`text-sm font-bold ${type === 'expense' ? 'text-primary' : 'text-slate-500'}`}>Gasto</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setType('income')}
                            className={`flex-1 items-center justify-center rounded-lg h-full ${type === 'income' ? 'bg-white dark:bg-modal-dark shadow-sm' : ''}`}
                        >
                            <Text className={`text-sm font-bold ${type === 'income' ? 'text-primary' : 'text-slate-500'}`}>Ingreso</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Linked Account */}
                {accounts.length > 0 && (
                    <View className="px-6 mb-6">
                        <Text className="text-slate-900 dark:text-white text-base font-bold mb-1">Cuenta vinculada</Text>
                        <Text className="text-slate-500 text-xs mb-3">Las transacciones ajustarán el saldo de esta cuenta</Text>
                        <View className="flex-row flex-wrap gap-2">
                            <TouchableOpacity
                                onPress={() => setSelectedAccount(null)}
                                className={`px-4 h-10 rounded-xl items-center justify-center ${selectedAccount === null ? 'bg-primary' : 'bg-slate-100 dark:bg-input-dark'}`}
                            >
                                <Text className={`text-sm font-semibold ${selectedAccount === null ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>Ninguna</Text>
                            </TouchableOpacity>
                            {accounts.map((acc) => {
                                const isActive = selectedAccount === acc.id;
                                const style = getCategoryStyle(acc.color);
                                return (
                                    <TouchableOpacity
                                        key={acc.id}
                                        onPress={() => setSelectedAccount(acc.id)}
                                        className={`flex-row items-center gap-2 px-4 h-10 rounded-xl ${isActive ? 'bg-primary' : 'bg-slate-100 dark:bg-input-dark'}`}
                                    >
                                        <MaterialIcons name={acc.icon} size={16} color={isActive ? 'white' : style.hex} />
                                        <Text className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{acc.name}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}

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
