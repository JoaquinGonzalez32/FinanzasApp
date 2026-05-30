import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { pickMessage, type NotificationTone } from "./messages";

const SETTINGS_KEY = "@finanza/notification-settings";
const REMINDER_IDENTIFIER = "finanza/daily-reminder";

export interface NotificationSettings {
    enabled: boolean;
    /** Local hour 0-23 */
    hour: number;
    /** Local minute 0-59 */
    minute: number;
    tone: NotificationTone;
}

export const DEFAULT_SETTINGS: NotificationSettings = {
    enabled: true,
    hour: 21,
    minute: 0,
    tone: "normal",
};

export async function getSettings(): Promise<NotificationSettings> {
    try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        if (!raw) return DEFAULT_SETTINGS;
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
        return DEFAULT_SETTINGS;
    }
}

export async function saveSettings(settings: NotificationSettings): Promise<void> {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function requestPermissions(): Promise<boolean> {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) return true;
    if (!existing.canAskAgain) return false;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
}

/**
 * Cancel any previously scheduled reminder and (if enabled) schedule a new
 * daily one at the configured local hour/minute. Idempotent.
 */
export async function applySchedule(settings: NotificationSettings): Promise<void> {
    // Always clear first — handles disable, time change, tone change.
    await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER).catch(() => {});

    if (!settings.enabled) return;

    if (Platform.OS === "web") return;

    const granted = await requestPermissions();
    if (!granted) return;

    const message = pickMessage(settings.tone);

    await Notifications.scheduleNotificationAsync({
        identifier: REMINDER_IDENTIFIER,
        content: {
            title: message.title,
            body: message.body,
            sound: true,
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: settings.hour,
            minute: settings.minute,
        },
    });
}

/** Foreground-presentation handler; call once at app start. */
export function configureForegroundBehavior(): void {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
        }),
    });
}
