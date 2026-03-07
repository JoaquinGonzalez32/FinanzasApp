import '../global.css';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold
} from '@expo-google-fonts/manrope';
import { useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

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

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
    const { user, loading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (!user && !inAuthGroup) {
            router.replace('/(auth)/login');
        } else if (user && inAuthGroup) {
            router.replace('/(tabs)');
        }
    }, [user, loading, segments]);

    if (loading) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
                <ActivityIndicator size="large" color="#137fec" />
            </View>
        );
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
                name="add-transaction"
                options={{
                    presentation: 'modal',
                    headerShown: false,
                    animation: 'slide_from_bottom'
                }}
            />
            <Stack.Screen
                name="profile"
                options={{
                    presentation: 'modal',
                    headerShown: false,
                    animation: 'slide_from_bottom'
                }}
            />
            <Stack.Screen
                name="add-category"
                options={{
                    presentation: 'modal',
                    headerShown: false,
                    animation: 'slide_from_bottom'
                }}
            />
            <Stack.Screen
                name="add-account"
                options={{
                    presentation: 'modal',
                    headerShown: false,
                    animation: 'slide_from_bottom'
                }}
            />
            <Stack.Screen
                name="all-transactions"
                options={{
                    presentation: 'modal',
                    headerShown: false,
                    animation: 'slide_from_bottom'
                }}
            />
            <Stack.Screen
                name="planning"
                options={{
                    presentation: 'modal',
                    headerShown: false,
                    animation: 'slide_from_bottom'
                }}
            />
            <Stack.Screen
                name="account-detail"
                options={{
                    presentation: 'modal',
                    headerShown: false,
                    animation: 'slide_from_bottom'
                }}
            />
            <Stack.Screen
                name="add-goal"
                options={{
                    presentation: 'modal',
                    headerShown: false,
                    animation: 'slide_from_bottom'
                }}
            />
            <Stack.Screen
                name="goal-detail"
                options={{
                    presentation: 'modal',
                    headerShown: false,
                    animation: 'slide_from_bottom'
                }}
            />
            <Stack.Screen
                name="recurring"
                options={{
                    presentation: 'modal',
                    headerShown: false,
                    animation: 'slide_from_bottom'
                }}
            />
        </Stack>
    );
}

export default function RootLayout() {
    const [loaded, error] = useFonts({
        Manrope_400Regular,
        Manrope_500Medium,
        Manrope_600SemiBold,
        Manrope_700Bold,
        Manrope_800ExtraBold,
    });

    useEffect(() => {
        if (loaded || error) {
            SplashScreen.hideAsync();
        }
    }, [loaded, error]);

    if (!loaded && !error) {
        return null;
    }

    return (
        <>
            <StatusBar style="auto" />
            <AuthProvider>
                <RootNavigator />
            </AuthProvider>
        </>
    );
}
