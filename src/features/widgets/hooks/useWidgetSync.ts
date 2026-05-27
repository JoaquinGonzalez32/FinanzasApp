import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { queryClient } from "../../../lib/queryClient";
import { buildWidgetData } from "../services/widgetData";
import { updateWidgetData, reloadWidgets } from "../services/widgetBridge";

const WATCHED_QUERY_PREFIXES = new Set([
  "transactions",
  "budget",
  "budgetIncome",
  "accounts",
  "categories",
]);

/**
 * Automatically sync widget data when relevant cached queries are
 * invalidated or updated. Place this once in a top-level component
 * (e.g., Home screen or root layout).
 *
 * Debounces updates — won't fire more than once per 2 seconds.
 */
export function useWidgetSync() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const syncWidgets = () => {
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

    // Listen to cache events for watched query prefixes.
    const unsubCache = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== "updated") return;
      const key = event.query.queryKey?.[0];
      if (typeof key === "string" && WATCHED_QUERY_PREFIXES.has(key)) {
        syncWidgets();
      }
    });

    // Also sync when app comes to foreground.
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") syncWidgets();
    });

    // Initial sync on mount.
    syncWidgets();

    return () => {
      unsubCache();
      sub.remove();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);
}
