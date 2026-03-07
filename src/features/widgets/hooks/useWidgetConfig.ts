import { useState, useEffect, useCallback } from "react";
import { loadWidgetConfig, saveWidgetConfig } from "../services/widgetConfig";
import { buildWidgetData } from "../services/widgetData";
import { updateWidgetData, reloadWidgets } from "../services/widgetBridge";
import type { WidgetConfig } from "../types/widget.types";
import { DEFAULT_WIDGET_CONFIG } from "../types/widget.types";

export function useWidgetConfig() {
  const [config, setConfig] = useState<WidgetConfig>(DEFAULT_WIDGET_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWidgetConfig()
      .then(setConfig)
      .finally(() => setLoading(false));
  }, []);

  const update = useCallback(async (patch: Partial<WidgetConfig>) => {
    const merged = await saveWidgetConfig(patch);
    setConfig(merged);

    // Re-sync widgets with new config
    try {
      const data = await buildWidgetData();
      await updateWidgetData(data);
      await reloadWidgets();
    } catch (e) {
      console.warn("[useWidgetConfig] sync after config change failed:", e);
    }
  }, []);

  return { config, loading, update };
}
