import { TouchableOpacity, useColorScheme, View, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ErrorBoundary({ error, retry }) {
    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: 24 }}>
            <MaterialIcons name="error-outline" size={48} color="#ef4444" />
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginTop: 16, textAlign: 'center' }}>
                Algo salio mal
            </Text>
            <Text style={{ fontSize: 14, color: '#64748b', marginTop: 8, textAlign: 'center' }}>
                {error?.message || 'Error inesperado'}
            </Text>
            <TouchableOpacity
                onPress={retry}
                style={{ marginTop: 24, backgroundColor: '#137fec', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
            >
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Reintentar</Text>
            </TouchableOpacity>
        </View>
    );
}

const TabIcon = ({ name, label, color, focused }) => (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 6 }}>
        <MaterialIcons name={name} size={22} color={color} />
        <Text style={{
            fontSize: 10,
            fontWeight: focused ? '700' : '500',
            color,
            marginTop: 2,
            fontFamily: Platform.select({ ios: 'Manrope_600SemiBold', default: undefined }),
        }}>
            {label}
        </Text>
    </View>
);

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
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
                    borderTopColor: isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(255, 255, 255, 0.4)',
                    height: 56 + insets.bottom,
                    paddingBottom: insets.bottom,
                    backgroundColor: isDark ? '#101922' : 'rgba(255, 255, 255, 0.65)',
                },
                tabBarShowLabel: false,
                tabBarActiveTintColor: '#137fec',
                tabBarInactiveTintColor: isDark ? '#475569' : '#a8a29e',
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon name="home-filled" label="Inicio" color={color} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="dashboard"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon name="pie-chart" label="Presupuesto" color={color} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="month"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon name="swap-vert" label="Movimientos" color={color} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="goals"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon name="flag" label="Metas" color={color} focused={focused} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    tabBarIcon: ({ color, focused }) => (
                        <TabIcon name="more-horiz" label="Mas" color={color} focused={focused} />
                    ),
                }}
            />
        </Tabs>
    );
}
