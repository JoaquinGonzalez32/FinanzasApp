import { View, Text, TouchableOpacity, Modal } from 'react-native';

const ConfirmModal = ({ visible, title, message, onConfirm, onCancel }) => (
    <Modal visible={visible} transparent animationType="fade">
        <View className="flex-1 bg-black/50 items-center justify-center px-6">
            <View className="w-full bg-white dark:bg-[#1a242f] rounded-2xl overflow-hidden">
                <View className="p-6">
                    <Text className="text-lg font-bold text-slate-900 dark:text-white text-center">{title}</Text>
                    <Text className="text-sm text-slate-500 text-center mt-2">{message}</Text>
                </View>
                <View className="flex-row border-t border-slate-200 dark:border-slate-700">
                    <TouchableOpacity
                        onPress={onCancel}
                        className="flex-1 py-4 items-center border-r border-slate-200 dark:border-slate-700"
                    >
                        <Text className="text-base font-semibold text-primary">Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={onConfirm}
                        className="flex-1 py-4 items-center"
                    >
                        <Text className="text-base font-bold text-red-500">Eliminar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
);

export default ConfirmModal;
