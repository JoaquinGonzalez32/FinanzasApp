import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WidgetConfig } from "../types/widget.types";
import { DEFAULT_WIDGET_CONFIG } from "../types/widget.types";

const STORAGE_KEY = "@finanza_widget_config";

export async function loadWidgetConfig(): Promise<WidgetConfig> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_WIDGET_CONFIG;
    return { ...DEFAULT_WIDGET_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_WIDGET_CONFIG;
  }
}

export async function saveWidgetConfig(config: Partial<WidgetConfig>): Promise<WidgetConfig> {
  const current = await loadWidgetConfig();
  const merged = { ...current, ...config };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
}
