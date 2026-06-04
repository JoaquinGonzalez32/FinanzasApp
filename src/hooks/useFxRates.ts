import { useCallback, useEffect, useState } from 'react';
import { useProfile } from './useProfile';
import { useAccountContext } from '../context/AccountContext';
import { loadFxRates, saveFxRates, type FxRates } from '../lib/fxRates';

interface UseFxRatesResult {
  /** User's base/display currency (from profile, falling back to first account). */
  baseCurrency: string;
  rates: FxRates;
  ready: boolean;
  /** Set the rate for one currency (units of base per 1 unit of `currency`). */
  setRate: (currency: string, unitsOfBase: number) => void;
  /**
   * Convert `amount` of `currency` into the base currency.
   * Returns null when a rate is required but not yet defined, so callers can
   * prompt the user instead of silently showing a wrong total.
   */
  convertToBase: (amount: number, currency: string) => number | null;
}

/**
 * R7 — manual FX so the "Todas las cuentas" aggregate can show a single total in
 * the user's base currency without inventing online exchange rates.
 */
export function useFxRates(): UseFxRatesResult {
  const { profile } = useProfile();
  const { accounts } = useAccountContext();

  const baseCurrency = profile?.currency || accounts[0]?.currency || 'UYU';

  const [rates, setRates] = useState<FxRates>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    loadFxRates().then((r) => {
      if (active) {
        setRates(r);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const setRate = useCallback((currency: string, unitsOfBase: number) => {
    setRates((prev) => {
      const next = { ...prev };
      if (Number.isFinite(unitsOfBase) && unitsOfBase > 0) {
        next[currency] = unitsOfBase;
      } else {
        delete next[currency];
      }
      saveFxRates(next);
      return next;
    });
  }, []);

  const convertToBase = useCallback(
    (amount: number, currency: string): number | null => {
      if (currency === baseCurrency) return amount;
      const rate = rates[currency];
      if (!rate || !Number.isFinite(rate) || rate <= 0) return null;
      return amount * rate;
    },
    [baseCurrency, rates],
  );

  return { baseCurrency, rates, ready, setRate, convertToBase };
}
