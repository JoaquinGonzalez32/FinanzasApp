import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, Platform, Alert } from 'react-native';
import { showError } from '../src/lib/friendlyError';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Button, Card, SkeletonLoader, useToast } from '../components/ui';
import { useProfile } from '../src/hooks/useProfile';
import { useAuth } from '../src/context/AuthContext';

export default function ProfileScreen() {
    const router = useRouter();
    const { profile, email, loading, saveProfile } = useProfile();
    const { signOut } = useAuth();
    const { show: showToast, ToastComponent } = useToast();

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
            showToast({ type: 'success', message: 'Perfil actualizado' });
        } catch (e) {
            showError(e);
        } finally {
            setSaving(false);
        }
    };

    const handleSignOut = async () => {
        if (Platform.OS === 'web') {
            if (window.confirm('Estas seguro que queres cerrar sesion?')) {
                await signOut();
            }
        } else {
            Alert.alert('Cerrar sesion', 'Estas seguro?', [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Salir',
                    style: 'destructive',
                    onPress: async () => {
                        await signOut();
                    },
                },
            ]);
        }
    };

    const avatarUri = profile?.avatar_url || null;
    const displayName = fullName || email?.split('@')[0] || '';
    const initials = displayName.charAt(0).toUpperCase();

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark px-5 pt-20">
                <View className="items-center gap-3">
                    <SkeletonLoader.Pulse style={{ width: 80, height: 80, borderRadius: 40 }} />
                    <SkeletonLoader.Pulse style={{ width: 120, height: 18 }} />
                    <SkeletonLoader.Pulse style={{ width: 160, height: 14 }} />
                </View>
                <View className="mt-8 gap-4">
                    <SkeletonLoader.Card lines={2} />
                    <SkeletonLoader.Card lines={2} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 py-2 border-b border-white/40 dark:border-slate-800">
                <TouchableOpacity onPress={() => router.back()} className="flex-row items-center">
                    <MaterialIcons name="chevron-left" size={28} color="#137fec" />
                    <Text className="text-primary font-medium text-base">Atras</Text>
                </TouchableOpacity>
                <Text className="text-base font-bold text-stone-900 dark:text-white">Mi Perfil</Text>
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
                        <View className="h-20 w-20 rounded-full bg-primary/10 items-center justify-center">
                            <Text className="text-primary text-3xl font-bold">{initials}</Text>
                        </View>
                    )}
                    <Text className="mt-3 text-lg font-bold text-stone-900 dark:text-white">{displayName}</Text>
                    <Text className="text-sm text-stone-500">{email}</Text>
                </View>

                {/* Form Fields */}
                <View className="px-5 gap-4">
                    <Card variant="outlined">
                        <Text className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-slate-400 mb-2">Nombre completo</Text>
                        <TextInput
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="Tu nombre"
                            placeholderTextColor="#a8a29e"
                            maxLength={100}
                            className="text-base text-stone-900 dark:text-white font-medium"
                        />
                    </Card>

                    <Card variant="outlined">
                        <Text className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-slate-400 mb-2">Usuario</Text>
                        <TextInput
                            value={username}
                            onChangeText={setUsername}
                            placeholder="@usuario"
                            placeholderTextColor="#a8a29e"
                            autoCapitalize="none"
                            maxLength={50}
                            className="text-base text-stone-900 dark:text-white font-medium"
                        />
                    </Card>

                    <Card variant="outlined">
                        <Text className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-slate-400 mb-2">Moneda</Text>
                        <View className="flex-row gap-3">
                            {['UYU', 'USD', 'EUR'].map((cur) => (
                                <TouchableOpacity
                                    key={cur}
                                    onPress={() => setCurrency(cur)}
                                    className={`px-4 py-2 rounded-lg ${currency === cur ? 'bg-primary' : 'bg-frost dark:bg-slate-800'}`}
                                >
                                    <Text className={`font-bold text-sm ${currency === cur ? 'text-white' : 'text-stone-600 dark:text-slate-400'}`}>
                                        {cur}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Card>

                    <Card variant="outlined" className="opacity-60">
                        <Text className="text-xs font-semibold uppercase tracking-wider text-stone-500 dark:text-slate-400 mb-2">Email</Text>
                        <Text className="text-base text-stone-900 dark:text-white font-medium">{email}</Text>
                    </Card>
                </View>

                {/* Sign Out */}
                <View className="px-5 mt-8">
                    <Button
                        variant="danger"
                        size="lg"
                        icon="logout"
                        fullWidth
                        onPress={handleSignOut}
                    >
                        Cerrar sesion
                    </Button>
                </View>
            </ScrollView>
            {ToastComponent}
        </SafeAreaView>
    );
}
