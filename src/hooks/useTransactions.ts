import { useState, useEffect, useCallback } from "react";
import type { Transaction, TransactionInsert } from "../types/database";
import * as svc from "../services/transactionsService";
import { onTransactionsChange } from "../lib/events";

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data: Transaction[];
      switch (options.mode) {
        case "today":
          data = await svc.getTodayTransactions();
          break;
        case "month":
          data = await svc.getMonthTransactions(options.year, options.month);
          break;
        case "date":
          data = await svc.getTransactionsByDate(options.date!);
          break;
      }
      setTransactions(data);
    } catch (e: any) {
      setError(e.message ?? "Error loading transactions");
    } finally {
      setLoading(false);
    }
  }, [options.mode, options.year, options.month, options.date]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Re-fetch when any screen emits a change
  useEffect(() => {
    return onTransactionsChange(() => {
      fetch();
    });
  }, [fetch]);

  const add = useCallback(
    async (tx: TransactionInsert) => {
      const created = await svc.createTransaction(tx);
      await fetch();
      return created;
    },
    [fetch]
  );

  const remove = useCallback(
    async (id: string) => {
      await svc.deleteTransaction(id);
      await fetch();
    },
    [fetch]
  );

  return { transactions, loading, error, refresh: fetch, add, remove };
}
