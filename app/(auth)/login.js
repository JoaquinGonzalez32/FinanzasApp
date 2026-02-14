import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../../src/context/AuthContext';

export default function LoginScreen() {
    const router = useRouter();
    const { signIn } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        if (!email.trim() || !password.trim()) {
            setError('Completá email y contraseña');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await signIn(email.trim(), password.trim());
        } catch (e) {
            setError(e.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1 justify-center px-6"
            >
                {/* Title */}
                <View className="items-center mb-10">
                    <Text className="text-3xl font-extrabold text-primary">FinanzaApp</Text>
                    <Text className="text-sm text-slate-500 mt-2">Ingresá a tu cuenta</Text>
                </View>

                {/* Email */}
                <View className="bg-white dark:bg-[#1a242f] rounded-xl border border-slate-200 dark:border-slate-800/50 p-4 mb-3">
                    <TextInput
                        value={email}
                        onChangeText={setEmail}
                        placeholder="Email"
                        placeholderTextColor="#94a3b8"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        className="text-base text-slate-900 dark:text-white font-medium"
                    />
                </View>

                {/* Password */}
                <View className="bg-white dark:bg-[#1a242f] rounded-xl border border-slate-200 dark:border-slate-800/50 p-4 mb-4">
                    <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Contraseña"
                        placeholderTextColor="#94a3b8"
                        secureTextEntry
                        className="text-base text-slate-900 dark:text-white font-medium"
                    />
                </View>

                {/* Error */}
                {error ? (
                    <Text className="text-red-500 text-sm text-center mb-3">{error}</Text>
                ) : null}

                {/* Login Button */}
                <TouchableOpacity
                    onPress={handleLogin}
                    disabled={loading}
                    className={`bg-primary rounded-xl h-14 items-center justify-center ${loading ? 'opacity-50' : ''}`}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white text-base font-bold">Ingresar</Text>
                    )}
                </TouchableOpacity>

                {/* Register Link */}
                <TouchableOpacity onPress={() => router.push('/(auth)/register')} className="mt-6 items-center">
                    <Text className="text-slate-500 text-sm">
                        ¿No tenés cuenta? <Text className="text-primary font-bold">Crear cuenta</Text>
                    </Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
