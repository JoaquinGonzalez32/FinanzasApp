import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import {
  onTransactionsChange,
  onBudgetChange,
  onAccountsChange,
  onCategoriesChange,
} from "../../../lib/events";
import { buildWidgetData } from "../services/widgetData";
import { updateWidgetData, reloadWidgets } from "../services/widgetBridge";

/**
 * Automatically sync widget data when relevant app state changes.
 * Place this once in a top-level component (e.g., Home screen or root layout).
 *
 * Debounces updates — won't fire more than once per 2 seconds.
 */
export function useWidgetSync() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncWidgets = () => {
    // Debounce: cancel previous pending sync
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        const data = await buildWidgetData();
        await updateWidgetData(data);
        await reloadWidgets();
      } catch (e) {
        console.warn("[useWidgetSync] sync failed:", e);
      }
    }, 2000);
  };

  useEffect(() => {
    // Subscribe to all data channels that affect widget content
    const unsubs = [
      onTransactionsChange(syncWidgets),
      onBudgetChange(syncWidgets),
      onAccountsChange(syncWidgets),
      onCategoriesChange(syncWidgets),
    ];

    // Also sync when app comes to foreground
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") syncWidgets();
    });

    // Initial sync on mount
    syncWidgets();

    return () => {
      unsubs.forEach((u) => u());
      sub.remove();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
