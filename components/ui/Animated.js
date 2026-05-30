import { useEffect, useRef, useCallback } from 'react';
import { Animated, TouchableOpacity } from 'react-native';
import { useReducedMotion } from '../../src/hooks/useReducedMotion';

/**
 * FadeIn — fade + slide up on mount
 * Usage: <FadeIn delay={100}><View>...</View></FadeIn>
 */
export const FadeIn = ({ children, delay = 0, duration = 400, translateY = 12, style }) => {
    const reducedMotion = useReducedMotion();
    const opacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
    const translate = useRef(new Animated.Value(reducedMotion ? 0 : translateY)).current;

    useEffect(() => {
        if (reducedMotion) {
            // Skip the entrance animation — render in final position immediately.
            opacity.setValue(1);
            translate.setValue(0);
            return;
        }
        const anim = Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration,
                delay,
                useNativeDriver: true,
            }),
            Animated.spring(translate, {
                toValue: 0,
                delay,
                tension: 65,
                friction: 11,
                useNativeDriver: true,
            }),
        ]);
        anim.start();
        return () => anim.stop();
    }, [reducedMotion]);

    return (
        <Animated.View style={[{ opacity, transform: [{ translateY: translate }] }, style]}>
            {children}
        </Animated.View>
    );
};

/**
 * StaggerList — renders children with staggered fade-in
 * Usage: <StaggerList stagger={60}>{items.map(...)}</StaggerList>
 */
export const StaggerList = ({ children, stagger = 50, baseDelay = 0 }) => {
    const items = Array.isArray(children) ? children : [children];
    return items.map((child, i) => (
        <FadeIn key={child?.key ?? i} delay={baseDelay + i * stagger}>
            {child}
        </FadeIn>
    ));
};

/**
 * ScalePress — bouncy scale on press
 * Usage: <ScalePress onPress={fn}><Card>...</Card></ScalePress>
 */
export const ScalePress = ({ children, onPress, onLongPress, disabled, activeScale = 0.97, style, className }) => {
    const scale = useRef(new Animated.Value(1)).current;

    const handlePressIn = useCallback(() => {
        Animated.spring(scale, {
            toValue: activeScale,
            tension: 150,
            friction: 8,
            useNativeDriver: true,
        }).start();
    }, [activeScale]);

    const handlePressOut = useCallback(() => {
        Animated.spring(scale, {
            toValue: 1,
            tension: 150,
            friction: 8,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <TouchableOpacity
            onPress={onPress}
            onLongPress={onLongPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
            disabled={disabled}
            className={className}
        >
            <Animated.View style={[{ transform: [{ scale }] }, style]}>
                {children}
            </Animated.View>
        </TouchableOpacity>
    );
};

/**
 * AnimatedProgressBar — fills from 0 to target width on mount
 */
export const AnimatedProgressBar = ({ percentage, color, height = 10, delay = 200, trackColor = '#e2e8f0' }) => {
    const reducedMotion = useReducedMotion();
    const width = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const target = Math.min(percentage, 100);
        if (reducedMotion) {
            width.setValue(target);
            return;
        }
        Animated.timing(width, {
            toValue: target,
            duration: 800,
            delay,
            useNativeDriver: false,
        }).start();
    }, [percentage, reducedMotion]);

    const animWidth = width.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
    });

    return (
        <Animated.View
            style={{
                height,
                backgroundColor: trackColor,
                borderRadius: height / 2,
                overflow: 'hidden',
            }}
        >
            <Animated.View
                style={{
                    height: '100%',
                    width: animWidth,
                    backgroundColor: color,
                    borderRadius: height / 2,
                }}
            />
        </Animated.View>
    );
};

/**
 * PulseView — continuous subtle pulse (for FAB, badges, etc.)
 */
export const PulseView = ({ children, style, minScale = 0.95, maxScale = 1.05, duration = 1500 }) => {
    const reducedMotion = useReducedMotion();
    const scale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (reducedMotion) {
            scale.setValue(1);
            return;
        }
        const anim = Animated.loop(
            Animated.sequence([
                Animated.timing(scale, { toValue: maxScale, duration: duration / 2, useNativeDriver: true }),
                Animated.timing(scale, { toValue: minScale, duration: duration / 2, useNativeDriver: true }),
            ])
        );
        anim.start();
        return () => anim.stop();
    }, [reducedMotion]);

    return (
        <Animated.View style={[{ transform: [{ scale }] }, style]}>
            {children}
        </Animated.View>
    );
};

/**
 * CountUp — animated number from 0 to target
 */
export const useCountUp = (target, duration = 700) => {
    const anim = useRef(new Animated.Value(0)).current;
    const displayRef = useRef(0);
    const [, forceUpdate] = useRef(0);

    useEffect(() => {
        anim.setValue(0);
        Animated.timing(anim, {
            toValue: target,
            duration,
            useNativeDriver: false,
        }).start();
    }, [target]);

    useEffect(() => {
        const id = anim.addListener(({ value }) => {
            displayRef.current = Math.round(value);
        });
        return () => anim.removeListener(id);
    }, []);

    return displayRef;
};
