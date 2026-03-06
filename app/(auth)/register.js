import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../../src/context/AuthContext';

export default function RegisterScreen() {
    const router = useRouter();
    const { signUp } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRegister = async () => {
        if (!email.trim() || !password.trim()) {
            setError('Completá email y contraseña');
            return;
        }
        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await signUp(email.trim(), password.trim());
            if (Platform.OS === 'web') {
                window.alert('Cuenta creada. Ya podés ingresar con tu cuenta.');
                router.replace('/login');
            } else {
                Alert.alert('Cuenta creada', 'Ya podés ingresar con tu cuenta', [
                    { text: 'OK', onPress: () => router.replace('/login') },
                ]);
            }
        } catch (e) {
            setError(e.message || 'Error al crear la cuenta');
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
                    <Text className="text-sm text-slate-500 mt-2">Creá tu cuenta</Text>
                </View>

                {/* Email */}
                <View className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800/50 p-4 mb-3">
                    <TextInput
                        value={email}
                        onChangeText={setEmail}
                        placeholder="Email"
                        placeholderTextColor="#94a3b8"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoComplete="email"
                        maxLength={254}
                        className="text-base text-slate-900 dark:text-white font-medium"
                    />
                </View>

                {/* Password */}
                <View className="bg-white dark:bg-surface-dark rounded-xl border border-slate-200 dark:border-slate-800/50 p-4 mb-4">
                    <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder="Contraseña (mín. 6 caracteres)"
                        placeholderTextColor="#94a3b8"
                        secureTextEntry
                        maxLength={128}
                        className="text-base text-slate-900 dark:text-white font-medium"
                    />
                </View>

                {/* Error */}
                {error ? (
                    <Text className="text-red-500 text-sm text-center mb-3">{error}</Text>
                ) : null}

                {/* Register Button */}
                <TouchableOpacity
                    onPress={handleRegister}
                    disabled={loading}
                    className={`bg-primary rounded-xl h-14 items-center justify-center ${loading ? 'opacity-50' : ''}`}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white text-base font-bold">Crear cuenta</Text>
                    )}
                </TouchableOpacity>

                {/* Back to Login */}
                <TouchableOpacity onPress={() => router.back()} className="mt-6 items-center">
                    <Text className="text-slate-500 text-sm">
                        ¿Ya tenés cuenta? <Text className="text-primary font-bold">Ingresar</Text>
                    </Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
