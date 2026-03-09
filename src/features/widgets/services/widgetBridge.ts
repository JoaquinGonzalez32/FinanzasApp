import { NativeModules, Platform } from "react-native";
import type { WidgetData } from "../types/widget.types";

/**
 * Bridge to native widget modules (iOS + Android).
 * Falls back gracefully on web or if native module is not linked.
 */

const NativeBridge = NativeModules.RNWidgetBridge;

function isAvailable(): boolean {
  return Platform.OS !== "web" && !!NativeBridge;
}

/** Push WidgetData to the native widget storage (App Groups / SharedPreferences) */
export async function updateWidgetData(data: WidgetData): Promise<void> {
  if (!isAvailable()) return;
  try {
    await NativeBridge.updateWidgetData(JSON.stringify(data));
  } catch (e) {
    console.warn("[WidgetBridge] updateWidgetData failed:", e);
  }
}

/** Force native widgets to re-render their timelines */
export async function reloadWidgets(): Promise<void> {
  if (!isAvailable()) return;
  try {
    await NativeBridge.reloadWidgets();
  } catch (e) {
    console.warn("[WidgetBridge] reloadWidgets failed:", e);
  }
}

/** Check which widget types the user has added to their home screen */
export async function getInstalledWidgets(): Promise<{
  quickAdd: boolean;
  summary: boolean;
  lastTransaction: boolean;
}> {
  if (!isAvailable()) {
    return { quickAdd: false, summary: false, lastTransaction: false };
  }
  try {
    return await NativeBridge.getInstalledWidgets();
  } catch {
    return { quickAdd: false, summary: false, lastTransaction: false };
  }
}
