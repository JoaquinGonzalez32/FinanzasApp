import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Account } from "../types/database";
import * as svc from "../services/accountsService";
import { qk } from "../lib/queryClient";

interface UseAccountsResult {
  accounts: Account[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAccounts(): UseAccountsResult {
  const query = useQuery({
    queryKey: qk.accounts,
    queryFn: () => svc.getAccounts(),
  });

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    accounts: query.data ?? [],
    loading: query.isPending,
    error: query.error ? (query.error as Error).message : null,
    refresh,
  };
}
