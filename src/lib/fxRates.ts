/**
 * FX rates — manual, user-editable exchange rates for cross-currency totals.
 *
 * Deliberately local (AsyncStorage), not server-side: this app is offline-first
 * manual entry with no bank aggregators, so rates are a *display preference*, not
 * authoritative financial data. Storing them locally keeps them manual/editable
 * with zero schema migration. If cross-device sync is ever needed, promote this
 * to a `jsonb` column on `profiles` — the shape below maps 1:1.
 *
 * Shape: { [currency]: unitsOfBasePerOneUnitOfCurrency }
 * e.g. base UYU, rates { USD: 40 } means 1 USD = 40 UYU.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export type FxRates = Record<string, number>;

const KEY = 'finanza_fx_rates_v1';

export async function loadFxRates(): Promise<FxRates> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      // Keep only positive finite numbers — guard against corrupted storage.
      const clean: FxRates = {};
      for (const [k, v] of Object.entries(parsed)) {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) clean[k] = n;
      }
      return clean;
    }
    return {};
  } catch {
    return {};
  }
}

export async function saveFxRates(rates: FxRates): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(rates));
  } catch {
    // Non-critical: a failed persist just means rates reset next launch.
  }
}
