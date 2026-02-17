import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useProfile } from '../src/hooks/useProfile';
import { useAuth } from '../src/context/AuthContext';

export default function ProfileScreen() {
    const router = useRouter();
    const { profile, email, loading, saveProfile } = useProfile();
    const { signOut } = useAuth();

    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [currency, setCurrency] = useState('UYU');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name ?? '');
            setUsername(profile.username ?? '');
            setCurrency(profile.currency ?? 'UYU');
        }
    }, [profile]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveProfile({
                full_name: fullName.trim() || null,
                username: username.trim() || null,
                currency: currency.trim() || 'UYU',
            });
            Alert.alert('Listo', 'Perfil actualizado');
        } catch (e) {
            Alert.alert('Error', e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSignOut = async () => {
        Alert.alert('Cerrar sesión', '¿Estás seguro?', [
            { text: 'Cancelar', style: 'cancel' },
            {
                text: 'Salir',
                style: 'destructive',
                onPress: async () => {
                    await signOut();
                },
            },
        ]);
    };

    const avatarUri = profile?.avatar_url || null;
    const displayName = fullName || email?.split('@')[0] || '';
    const initials = displayName.charAt(0).toUpperCase();

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark items-center justify-center">
                <ActivityIndicator size="large" color="#137fec" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800">
                <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
                    <MaterialIcons name="chevron-left" size={28} color="#137fec" />
                    <Text className="text-primary font-medium text-base">Atrás</Text>
                </TouchableOpacity>
                <Text className="text-base font-bold text-slate-900 dark:text-white">Mi Perfil</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving}>
                    <Text className={`text-primary font-bold text-base ${saving ? 'opacity-50' : ''}`}>
                        {saving ? 'Guardando' : 'Guardar'}
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Avatar + Name */}
                <View className="items-center py-8">
                    {avatarUri ? (
                        <Image source={{ uri: avatarUri }} className="h-20 w-20 rounded-full border-2 border-primary/20" />
                    ) : (
                        <View className="h-20 w-20 rounded-full bg-primary/20 items-center justify-center">
                            <Text className="text-primary text-3xl font-bold">{initials}</Text>
                        </View>
                    )}
                    <Text className="mt-3 text-lg font-bold text-slate-900 dark:text-white">{displayName}</Text>
                    <Text className="text-sm text-slate-500">{email}</Text>
                </View>

                {/* Form Fields */}
                <View className="px-4 gap-4">
                    {/* Full Name */}
                    <View className="bg-white dark:bg-[#1a242f] rounded-xl border border-slate-200 dark:border-slate-800/50 p-4">
                        <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Nombre completo</Text>
                        <TextInput
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="Tu nombre"
                            placeholderTextColor="#94a3b8"
                            className="text-base text-slate-900 dark:text-white font-medium"
                        />
                    </View>

                    {/* Username */}
                    <View className="bg-white dark:bg-[#1a242f] rounded-xl border border-slate-200 dark:border-slate-800/50 p-4">
                        <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Usuario</Text>
                        <TextInput
                            value={username}
                            onChangeText={setUsername}
                            placeholder="@usuario"
                            placeholderTextColor="#94a3b8"
                            autoCapitalize="none"
                            className="text-base text-slate-900 dark:text-white font-medium"
                        />
                    </View>

                    {/* Currency */}
                    <View className="bg-white dark:bg-[#1a242f] rounded-xl border border-slate-200 dark:border-slate-800/50 p-4">
                        <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Moneda</Text>
                        <View className="flex-row gap-3">
                            {['UYU', 'USD', 'EUR'].map((cur) => (
                                <TouchableOpacity
                                    key={cur}
                                    onPress={() => setCurrency(cur)}
                                    className={`px-4 py-2 rounded-lg ${currency === cur ? 'bg-primary' : 'bg-slate-100 dark:bg-slate-800'}`}
                                >
                                    <Text className={`font-bold text-sm ${currency === cur ? 'text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                        {cur}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Email (read-only) */}
                    <View className="bg-white dark:bg-[#1a242f] rounded-xl border border-slate-200 dark:border-slate-800/50 p-4 opacity-60">
                        <Text className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Email</Text>
                        <Text className="text-base text-slate-900 dark:text-white font-medium">{email}</Text>
                    </View>
                </View>

                {/* Sign Out */}
                <View className="px-4 mt-8">
                    <TouchableOpacity
                        onPress={handleSignOut}
                        className="bg-red-500/10 rounded-xl p-4 flex-row items-center justify-center gap-2"
                    >
                        <MaterialIcons name="logout" size={20} color="#ef4444" />
                        <Text className="text-red-500 font-bold text-base">Cerrar sesión</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
