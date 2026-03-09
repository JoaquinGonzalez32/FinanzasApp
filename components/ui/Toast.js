import { useEffect, useRef, useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, Animated, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const TOAST_TYPES = {
    success: { icon: 'check-circle', bg: 'bg-emerald-600', iconColor: '#ffffff' },
    error: { icon: 'error', bg: 'bg-red-600', iconColor: '#ffffff' },
    warning: { icon: 'warning', bg: 'bg-amber-500', iconColor: '#ffffff' },
    info: { icon: 'info', bg: 'bg-stone-800 dark:bg-slate-200', iconColor: '#ffffff' },
    undo: { icon: 'undo', bg: 'bg-stone-800 dark:bg-slate-200', iconColor: '#ffffff' },
};

const Toast = ({ visible, type = 'success', message, action, onAction, onDismiss, duration = 3000 }) => {
    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const timerRef = useRef(null);
    const config = TOAST_TYPES[type] || TOAST_TYPES.info;

    const hide = useCallback(() => {
        Animated.parallel([
            Animated.timing(translateY, { toValue: -100, duration: 250, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(() => {
            if (onDismiss) onDismiss();
        });
    }, [translateY, opacity, onDismiss]);

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(translateY, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]).start();

            if (duration > 0) {
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(hide, duration);
            }
        } else {
            hide();
        }

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [visible, duration, hide, translateY, opacity]);

    const handleAction = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (onAction) onAction();
        hide();
    };

    // Determine text color based on type for dark mode
    const textColor = type === 'info' || type === 'undo'
        ? 'text-white dark:text-slate-900'
        : 'text-white';

    return (
        <Animated.View
            pointerEvents={visible ? 'auto' : 'none'}
            style={{
                position: 'absolute',
                top: Platform.OS === 'ios' ? 60 : 40,
                left: 20,
                right: 20,
                zIndex: 9999,
                transform: [{ translateY }],
                opacity,
            }}
        >
            <View className={`flex-row items-center ${config.bg} rounded-2xl px-4 py-3.5 shadow-sm`}>
                <MaterialIcons name={config.icon} size={20} color={config.iconColor} />
                <Text className={`flex-1 ${textColor} text-sm font-semibold ml-3`} numberOfLines={2}>
                    {message}
                </Text>
                {action && (
                    <TouchableOpacity onPress={handleAction} className="ml-3 px-3 py-1 rounded-lg bg-white/20">
                        <Text className={`text-xs font-bold ${textColor}`}>
                            {action}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    );
};

// Hook for easy toast management
export const useToast = () => {
    const [toast, setToast] = useState({ visible: false, type: 'success', message: '', action: null, onAction: null });

    const show = useCallback(({ type = 'success', message, action, onAction, duration }) => {
        setToast({ visible: true, type, message, action, onAction, duration });
    }, []);

    const dismiss = useCallback(() => {
        setToast(prev => ({ ...prev, visible: false }));
    }, []);

    const ToastComponent = (
        <Toast
            visible={toast.visible}
            type={toast.type}
            message={toast.message}
            action={toast.action}
            onAction={toast.onAction}
            onDismiss={dismiss}
            duration={toast.duration}
        />
    );

    return { show, dismiss, ToastComponent };
};

export default Toast;
