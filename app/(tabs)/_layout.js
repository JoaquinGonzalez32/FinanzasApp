import { Platform, TouchableOpacity, useColorScheme } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { View, Text } from 'react-native';

export function ErrorBoundary({ error, retry }) {
    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', padding: 24 }}>
            <MaterialIcons name="error-outline" size={48} color="#ef4444" />
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginTop: 16, textAlign: 'center' }}>
                Algo salió mal
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

const TabIcon = ({ name, color }) => (
    <MaterialIcons name={name} size={24} color={color} />
);

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

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
                    borderTopColor: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.5)',
                    height: 60,
                    backgroundColor: isDark ? '#101922' : '#ffffff',
                },
                tabBarShowLabel: false,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} />,
                    tabBarActiveTintColor: '#137fec',
                    tabBarInactiveTintColor: '#94a3b8',
                }}
            />
            <Tabs.Screen
                name="dashboard"
                options={{
                    tabBarIcon: ({ color, focused }) => <TabIcon name="analytics" color={color} focused={focused} />, // analytics icon
                    tabBarActiveTintColor: '#137fec',
                    tabBarInactiveTintColor: '#94a3b8',
                }}
            />
            <Tabs.Screen
                name="month"
                options={{
                    tabBarIcon: ({ color, focused }) => <TabIcon name="calendar-today" color={color} focused={focused} />,
                    tabBarActiveTintColor: '#137fec',
                    tabBarInactiveTintColor: '#94a3b8',
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    tabBarIcon: ({ color, focused }) => <TabIcon name="category" color={color} focused={focused} />,
                    tabBarActiveTintColor: '#137fec',
                    tabBarInactiveTintColor: '#94a3b8',
                }}
            />
        </Tabs>
    );
}
