import { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

const SkeletonPulse = ({ className: extraClass = '', style }) => {
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [opacity]);

    return (
        <Animated.View
            className={`bg-primary/10 dark:bg-slate-700 rounded-lg ${extraClass}`}
            style={[{ opacity }, style]}
        />
    );
};

// Pre-built skeleton patterns

const TransactionSkeleton = () => (
    <View className="flex-row items-center gap-4 p-3 mb-3">
        <SkeletonPulse style={{ width: 48, height: 48, borderRadius: 12 }} />
        <View className="flex-1 gap-2">
            <SkeletonPulse style={{ width: '60%', height: 14 }} />
            <SkeletonPulse style={{ width: '40%', height: 10 }} />
        </View>
        <SkeletonPulse style={{ width: 64, height: 14 }} />
    </View>
);

const MetricSkeleton = () => (
    <View className="p-4 bg-white/75 dark:bg-surface-dark dark:border dark:border-slate-800 rounded-2xl shadow-sm">
        <SkeletonPulse style={{ width: 80, height: 10 }} className="mb-3" />
        <SkeletonPulse style={{ width: 120, height: 28 }} className="mb-2" />
        <SkeletonPulse style={{ width: 100, height: 10 }} />
    </View>
);

const CardSkeleton = ({ lines = 3 }) => (
    <View className="p-4 bg-white/75 dark:bg-surface-dark dark:border dark:border-slate-800 rounded-2xl shadow-sm gap-3">
        {Array.from({ length: lines }).map((_, i) => (
            <SkeletonPulse
                key={i}
                style={{ width: i === 0 ? '70%' : i === lines - 1 ? '50%' : '90%', height: 12 }}
            />
        ))}
    </View>
);

const ListSkeleton = ({ count = 3 }) => (
    <View>
        {Array.from({ length: count }).map((_, i) => (
            <TransactionSkeleton key={i} />
        ))}
    </View>
);

const SkeletonLoader = {
    Pulse: SkeletonPulse,
    Transaction: TransactionSkeleton,
    Metric: MetricSkeleton,
    Card: CardSkeleton,
    List: ListSkeleton,
};

export default SkeletonLoader;
