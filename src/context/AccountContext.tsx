import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Account } from "../types/database";
import { useAccounts } from "../hooks/useAccounts";

const STORAGE_KEY = "finanza_selected_account_id";

interface AccountContextValue {
  /** null = "Todas las cuentas" */
  selectedAccountId: string | null;
  selectedAccount: Account | null;
  accounts: Account[];
  accountsLoading: boolean;
  selectAccount: (accountId: string | null) => void;
  isAllAccounts: boolean;
  /** Currencies of the selected account, or all distinct currencies when "Todas" */
  activeCurrencies: string[];
  refreshAccounts: () => Promise<void>;
}

const AccountContext = createContext<AccountContextValue>({
  selectedAccountId: null,
  selectedAccount: null,
  accounts: [],
  accountsLoading: true,
  selectAccount: () => {},
  isAllAccounts: true,
  activeCurrencies: [],
  refreshAccounts: async () => {},
});

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { accounts, loading: accountsLoading, refresh: refreshAccounts } = useAccounts();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate persisted selection
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) setSelectedAccountId(stored);
      setHydrated(true);
    });
  }, []);

  // If the selected account was deleted, fallback to "Todas"
  useEffect(() => {
    if (!accountsLoading && hydrated && selectedAccountId) {
      const exists = accounts.some((a) => a.id === selectedAccountId);
      if (!exists) {
        setSelectedAccountId(null);
        AsyncStorage.removeItem(STORAGE_KEY);
      }
    }
  }, [accounts, accountsLoading, hydrated, selectedAccountId]);

  const selectAccount = useCallback((accountId: string | null) => {
    setSelectedAccountId(accountId);
    if (accountId) {
      AsyncStorage.setItem(STORAGE_KEY, accountId);
    } else {
      AsyncStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId],
  );

  const isAllAccounts = selectedAccountId === null;

  const activeCurrencies = useMemo(() => {
    if (selectedAccount) return [selectedAccount.currency];
    const set = new Set(accounts.map((a) => a.currency));
    return Array.from(set);
  }, [accounts, selectedAccount]);

  return (
    <AccountContext.Provider
      value={{
        selectedAccountId,
        selectedAccount,
        accounts,
        accountsLoading,
        selectAccount,
        isAllAccounts,
        activeCurrencies,
        refreshAccounts,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccountContext() {
  return useContext(AccountContext);
}
