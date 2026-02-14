import { useState, useEffect, useCallback } from "react";
import type { Account } from "../types/database";
import * as svc from "../services/accountsService";
import { onAccountsChange } from "../lib/events";

interface UseAccountsResult {
  accounts: Account[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAccounts(): UseAccountsResult {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await svc.getAccounts();
      setAccounts(data);
    } catch (e: any) {
      // TODO: Si la tabla no existe en Supabase, este error aparecerá.
      // Crear la tabla accounts con el SQL del archivo accountsService.ts
      setError(e.message ?? "Error loading accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  useEffect(() => {
    return onAccountsChange(() => {
      fetch();
    });
  }, [fetch]);

  return { accounts, loading, error, refresh: fetch };
}
