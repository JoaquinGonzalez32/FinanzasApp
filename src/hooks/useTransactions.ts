import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Transaction, TransactionInsert } from "../types/database";
import * as svc from "../services/transactionsService";
import { qk, invalidate } from "../lib/queryClient";

interface UseTransactionsOptions {
  mode: "today" | "month" | "date";
  year?: number;
  month?: number;
  date?: string;
}

interface UseTransactionsResult {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  add: (tx: TransactionInsert) => Promise<Transaction>;
  remove: (id: string) => Promise<void>;
}

export function useTransactions(
  options: UseTransactionsOptions
): UseTransactionsResult {
  const query = useQuery({
    queryKey: qk.transactions(options),
    queryFn: async () => {
      switch (options.mode) {
        case "today":
          return svc.getTodayTransactions();
        case "month":
          return svc.getMonthTransactions(options.year, options.month);
        case "date":
          return svc.getTransactionsByDate(options.date!);
      }
    },
  });

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  const add = useCallback(async (tx: TransactionInsert) => {
    const created = await svc.createTransaction(tx);
    invalidate.transactions();
    return created;
  }, []);

  const remove = useCallback(async (id: string) => {
    await svc.deleteTransaction(id);
    invalidate.transactions();
  }, []);

  return {
    transactions: query.data ?? [],
    loading: query.isPending,
    error: query.error ? (query.error as Error).message : null,
    refresh,
    add,
    remove,
  };
}
