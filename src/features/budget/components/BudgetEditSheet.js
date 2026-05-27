import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BottomSheet, Button } from '../../../../components/ui';
import { getCategoryStyle, getCurrencySymbol, monthLabel } from '../../../lib/helpers';

/**
 * Bottom-sheet UI for editing a month's budget assignments + the
 * category picker that opens on top. All state lives in the parent
 * screen; this component is purely presentational.
 */
export default function BudgetEditSheet({
    visible,
    onClose,
    selectedAccount,
    isAllAccounts,
    distMonth,
    visibleAssignments,
    assignmentCurrency,
    updateAmount,
    removeAssignment,
    pickerVisible,
    setPickerVisible,
    availableCategories,
    addCategory,
    isDirty,
    saving,
    onSave,
}) {
    const sheetSubtitle = selectedAccount
        ? `${selectedAccount.name} · ${monthLabel(distMonth)}`
        : `Todas las cuentas · ${monthLabel(distMonth)}`;

    return (
        <>
            <BottomSheet
                visible={visible}
                onClose={onClose}
                title="Editar Presupuesto"
                subtitle={sheetSubtitle}
            >
                <ScrollView className="px-5" contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }} keyboardShouldPersistTaps="handled">
                    <View className="gap-3">
                        {visibleAssignments.map((a, idx) => {
                            const style = getCategoryStyle(a.category?.color);
                            const cur = isAllAccounts ? assignmentCurrency(a) : selectedAccount?.currency;
                            return (
                                <View key={a.budgetItemId || `local-${idx}`} className="flex-row items-center gap-3 bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm px-4 py-3">
                                    <View className={`h-9 w-9 rounded-xl items-center justify-center ${style.bg}`}>
                                        <MaterialIcons name={a.category?.icon || 'category'} size={20} color={style.hex} />
                                    </View>
                                    <Text className="flex-1 text-sm font-semibold text-slate-900 dark:text-white" numberOfLines={1}>
                                        {a.category?.name || 'Sin categoria'}
                                    </Text>
                                    <View className="flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-lg px-2">
                                        <Text className="text-slate-400 font-bold text-sm">{getCurrencySymbol(cur)}</Text>
                                        <TextInput
                                            value={a.amount > 0 ? String(a.amount) : ''}
                                            onChangeText={(v) => updateAmount(idx, v)}
                                            keyboardType="numeric"
                                            placeholder="0"
                                            placeholderTextColor="#94A3B8"
                                            maxLength={15}
                                            className="w-20 h-9 text-center text-sm font-bold text-slate-900 dark:text-white"
                                            accessibilityLabel={`Monto para ${a.category?.name || 'categoria'}`}
                                        />
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => removeAssignment(idx)}
                                        className="h-7 w-7 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10"
                                        accessibilityRole="button"
                                        accessibilityLabel={`Quitar ${a.category?.name || 'categoria'}`}
                                    >
                                        <MaterialIcons name="close" size={16} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>

                    <TouchableOpacity
                        onPress={() => setPickerVisible(true)}
                        disabled={availableCategories.length === 0}
                        className={`flex-row items-center justify-center gap-2 mt-4 py-3 rounded-xl border border-dashed ${availableCategories.length > 0 ? 'border-primary/40 bg-primary-faint dark:bg-primary/10' : 'border-slate-200 dark:border-slate-700'}`}
                        accessibilityRole="button"
                        accessibilityLabel="Agregar categoría al presupuesto"
                    >
                        <MaterialIcons name="add" size={18} color={availableCategories.length > 0 ? '#6366F1' : '#94A3B8'} />
                        <Text className={`text-sm font-bold ${availableCategories.length > 0 ? 'text-primary' : 'text-slate-400'}`}>
                            Agregar categoria
                        </Text>
                    </TouchableOpacity>
                </ScrollView>

                {isDirty && (
                    <View className="px-5 pt-3 pb-2 border-t border-slate-100 dark:border-slate-800">
                        <Button
                            variant="primary"
                            size="lg"
                            fullWidth
                            loading={saving}
                            onPress={onSave}
                        >
                            Guardar
                        </Button>
                    </View>
                )}
            </BottomSheet>

            <BottomSheet
                visible={pickerVisible}
                onClose={() => setPickerVisible(false)}
                title="Seleccionar categoria"
                maxHeight="70%"
            >
                <ScrollView className="px-5 pb-8">
                    {availableCategories.length === 0 ? (
                        <View className="items-center py-8">
                            <MaterialIcons name="check-circle" size={40} color="#10b981" />
                            <Text className="text-slate-400 text-sm font-medium mt-3">Todas las categorias asignadas</Text>
                        </View>
                    ) : (
                        <View className="gap-2 pb-8 pt-4">
                            {availableCategories.map(cat => {
                                const style = getCategoryStyle(cat.color);
                                return (
                                    <TouchableOpacity
                                        key={cat.id}
                                        onPress={() => addCategory(cat)}
                                        className="flex-row items-center gap-3 p-4 bg-white dark:bg-card-dark rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
                                        accessibilityRole="button"
                                        accessibilityLabel={`Agregar ${cat.name}`}
                                    >
                                        <View className={`h-10 w-10 rounded-xl items-center justify-center ${style.bg}`}>
                                            <MaterialIcons name={cat.icon} size={22} color={style.hex} />
                                        </View>
                                        <Text className="flex-1 text-sm font-bold text-slate-900 dark:text-white">{cat.name}</Text>
                                        <MaterialIcons name="add-circle-outline" size={22} color="#94A3B8" />
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>
            </BottomSheet>
        </>
    );
}
