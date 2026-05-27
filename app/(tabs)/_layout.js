/**
 * TAB LAYOUT — 5 visible tabs
 *
 * Structure:
 *   Inicio | Presupuesto | Movimientos | Metas | Gestion
 *
 * Tab Bar:
 * - Clean white (light) / dark slate (dark)
 * - Indigo active color
 * - Custom TabIcon with label
 * - No transparency gimmicks
 */
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/theme/useTheme';
import ErrorBoundaryFallback from '../../components/ui/ErrorBoundaryFallback';

export function ErrorBoundary(props) {
    return <ErrorBoundaryFallback {...props} />;
}

const TabIcon = ({ name, color, focused }) => (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <MaterialIcons name={name} size={24} color={color} />
    </View>
);

export default function TabLayout() {
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    elevation: 0,
                    borderTopWidth: 1,
                    borderTopColor: isDark ? '#1E293B' : '#E2E8F0',
                    height: 56 + insets.bottom,
                    paddingBottom: insets.bottom,
                    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                },
                tabBarShowLabel: false,
                tabBarActiveTintColor: '#6366F1',
                tabBarInactiveTintColor: isDark ? '#475569' : '#94A3B8',
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon name="home-filled" color={color} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="dashboard"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon name="pie-chart" color={color} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="month"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon name="receipt-long" color={color} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="goals"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon name="flag" color={color} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon name="tune" color={color} focused={focused} />
                    ),
                }}
            />
        </Tabs>
    );
}
