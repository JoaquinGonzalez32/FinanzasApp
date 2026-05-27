/**
 * ActionButton — Floating action button (FAB)
 *
 * Primary CTA for the app — always visible, always accessible.
 * Indigo with glow shadow, spring entrance animation.
 */
import { TouchableOpacity, Animated, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRef, useEffect } from 'react';
import { haptics } from '../../src/lib/haptics';

const ActionButton = ({
    icon = 'add',
    onPress,
    bottom = 96,
    right = 20,
    size = 56,
    color = '#6366F1',
    accessibilityLabel,
}) => {
    const handlePress = (e) => {
        haptics.medium();
        if (onPress) onPress(e);
    };
    const scale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(scale, {
            toValue: 1,
            delay: 400,
            tension: 80,
            friction: 8,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <Animated.View
            style={{
                position: 'absolute',
                bottom,
                right,
                transform: [{ scale }],
            }}
        >
            <TouchableOpacity
                onPress={handlePress}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel ?? 'Agregar transacción'}
                style={{
                    height: size,
                    width: size,
                    borderRadius: size / 2,
                    backgroundColor: color,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: color,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.35,
                    shadowRadius: 14,
                    elevation: 10,
                }}
            >
                <MaterialIcons name={icon} size={28} color="#ffffff" />
            </TouchableOpacity>
        </Animated.View>
    );
};

export default ActionButton;
