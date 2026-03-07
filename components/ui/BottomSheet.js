/**
 * BottomSheet — Slide-up modal container
 *
 * Used for:
 * - Quick add transaction (frequent categories + amount)
 * - Budget editing
 * - Calendar picker
 *
 * Renders as a transparent Modal with dark overlay and rounded top container.
 */
import { View, Text, TouchableOpacity, Modal, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const BottomSheet = ({
    visible,
    onClose,
    title,
    subtitle,
    maxHeight = '82%',
    children,
}) => {
    return (
        <Modal visible={visible} animationType="slide" transparent>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className="flex-1"
            >
                <View className="flex-1 bg-black/50 justify-end">
                    {/* Backdrop tap to close */}
                    <Pressable className="flex-1" onPress={onClose} />

                    <View
                        className="bg-white dark:bg-surface-dark rounded-t-3xl"
                        style={{ maxHeight }}
                    >
                        {/* Handle */}
                        <View className="items-center pt-3 pb-1">
                            <View className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
                        </View>

                        {/* Header */}
                        {(title || onClose) && (
                            <View className="flex-row items-center justify-between px-5 pt-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                                <View className="flex-1">
                                    {title && (
                                        <Text className="text-lg font-bold text-slate-900 dark:text-white">
                                            {title}
                                        </Text>
                                    )}
                                    {subtitle && (
                                        <Text className="text-xs text-slate-400 font-medium mt-0.5">
                                            {subtitle}
                                        </Text>
                                    )}
                                </View>
                                <TouchableOpacity
                                    onPress={onClose}
                                    className="h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
                                >
                                    <MaterialIcons name="close" size={20} color="#64748b" />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Content */}
                        {children}

                        <SafeAreaView edges={['bottom']} />
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

export default BottomSheet;
