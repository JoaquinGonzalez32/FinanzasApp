import { View, Text, TouchableOpacity, Switch, Platform, Alert, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { FadeIn } from '../../../components/ui';
import {
    DEFAULT_SETTINGS,
    getSettings,
    saveSettings,
    applySchedule,
    requestPermissions,
} from './notificationService';
import { pickMessage } from './messages';

const HOUR_PRESETS = [
    { hour: 9, minute: 0, label: '09:00' },
    { hour: 13, minute: 0, label: '13:00' },
    { hour: 18, minute: 0, label: '18:00' },
    { hour: 21, minute: 0, label: '21:00' },
    { hour: 23, minute: 0, label: '23:00' },
];

export default function NotificationSettingsSection() {
    const [settings, setSettings] = useState(DEFAULT_SETTINGS);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        (async () => {
            setSettings(await getSettings());
            setLoaded(true);
        })();
    }, []);

    const update = async (patch) => {
        const next = { ...settings, ...patch };
        setSettings(next);
        await saveSettings(next);
        await applySchedule(next);
    };

    const handleEnableToggle = async (value) => {
        if (value && Platform.OS !== 'web') {
            const granted = await requestPermissions();
            if (!granted) {
                Alert.alert(
                    'Permiso requerido',
                    'Activá las notificaciones desde los ajustes del sistema para recibir recordatorios.',
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Abrir ajustes', onPress: () => Linking.openSettings() },
                    ],
                );
                return;
            }
        }
        await update({ enabled: value });
    };

    if (!loaded) return null;

    const preview = pickMessage(settings.tone);

    return (
        <FadeIn delay={325}>
            <View className="px-5 pb-5">
                <Text className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                    Notificaciones
                </Text>

                <View className="bg-white dark:bg-card-dark rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                    {/* Enable row */}
                    <View className="flex-row items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
                        <View className="h-9 w-9 rounded-xl bg-primary-faint dark:bg-primary/10 items-center justify-center">
                            <MaterialIcons name="notifications" size={18} color="#6366F1" />
                        </View>
                        <View className="flex-1">
                            <Text className="text-sm font-semibold text-slate-800 dark:text-white">Recordatorio diario</Text>
                            <Text className="text-xs text-slate-400 mt-0.5">Una notificación por día, a la hora que elijas</Text>
                        </View>
                        <Switch
                            value={settings.enabled}
                            onValueChange={handleEnableToggle}
                            trackColor={{ false: '#cbd5e1', true: '#6366F1' }}
                            thumbColor="white"
                            accessibilityLabel="Activar recordatorio diario"
                        />
                    </View>

                    {settings.enabled && (
                        <>
                            {/* Hour presets */}
                            <View className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                                <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Hora</Text>
                                <View className="flex-row flex-wrap gap-2">
                                    {HOUR_PRESETS.map((p) => {
                                        const active = settings.hour === p.hour && settings.minute === p.minute;
                                        return (
                                            <TouchableOpacity
                                                key={p.label}
                                                onPress={() => update({ hour: p.hour, minute: p.minute })}
                                                className={`px-3 py-2 rounded-lg ${active ? 'bg-primary' : 'bg-slate-100 dark:bg-slate-800'}`}
                                                accessibilityRole="button"
                                                accessibilityLabel={`Programar a las ${p.label}`}
                                                accessibilityState={{ selected: active }}
                                            >
                                                <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                                    {p.label}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Tone */}
                            <View className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                                <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Tono</Text>
                                <View className="flex-row gap-2">
                                    {[
                                        { key: 'normal', label: 'Normal', desc: 'Amable' },
                                        { key: 'vialli', label: 'Vialli', desc: 'Puteador' },
                                    ].map((opt) => {
                                        const active = settings.tone === opt.key;
                                        return (
                                            <TouchableOpacity
                                                key={opt.key}
                                                onPress={() => update({ tone: opt.key })}
                                                className={`flex-1 py-2.5 rounded-lg items-center ${active ? 'bg-primary' : 'bg-slate-100 dark:bg-slate-800'}`}
                                                accessibilityRole="button"
                                                accessibilityLabel={`Tono ${opt.label}`}
                                                accessibilityState={{ selected: active }}
                                            >
                                                <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                                    {opt.label}
                                                </Text>
                                                <Text className={`text-[10px] mt-0.5 ${active ? 'text-white/80' : 'text-slate-400'}`}>
                                                    {opt.desc}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {/* Preview */}
                            <View className="px-4 py-3">
                                <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Vista previa</Text>
                                <View className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                                    <Text className="text-sm font-bold text-slate-800 dark:text-white">{preview.title}</Text>
                                    <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{preview.body}</Text>
                                </View>
                            </View>
                        </>
                    )}
                </View>
            </View>
        </FadeIn>
    );
}
