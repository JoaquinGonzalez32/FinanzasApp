import { useCallback, useEffect, useRef } from "react";
import { optimisticTx, invalidate } from "../lib/queryClient";
import { deleteTransaction } from "../services/transactionsService";
import { friendlyMessage } from "../lib/friendlyError";
import type { Transaction } from "../types/database";

/** How long the row stays "deleted but recoverable" before we hit the server. */
const UNDO_WINDOW_MS = 4000;

interface ToastConfig {
  type: string;
  message: string;
  action?: string;
  onAction?: () => void;
  duration?: number;
}

interface PendingDelete {
  timer: ReturnType<typeof setTimeout>;
  rollback: () => void;
  id: string;
}

/**
 * Optimistic, undoable transaction deletion.
 *
 * `requestDelete(tx, label)` removes the row from every list cache instantly and
 * shows a "Deshacer" toast. The actual `deleteTransaction` network call is
 * deferred until the undo window closes — so undo is free (no re-create) and
 * the server is never touched if the user changes their mind. A pending delete
 * is flushed (committed) when the screen unmounts so it can't silently revert.
 */
export function useUndoableTransactionDelete(
  showToast: (config: ToastConfig) => void
) {
  const pending = useRef<PendingDelete | null>(null);

  const commit = useCallback(
    async (id: string, rollback: () => void) => {
      try {
        await deleteTransaction(id);
        invalidate.transactions();
      } catch (e) {
        rollback();
        showToast({ type: "error", message: friendlyMessage(e) });
      }
    },
    [showToast]
  );

  /** Commit any in-flight undoable delete immediately. */
  const flush = useCallback(() => {
    const p = pending.current;
    if (!p) return;
    clearTimeout(p.timer);
    pending.current = null;
    void commit(p.id, p.rollback);
  }, [commit]);

  const requestDelete = useCallback(
    (tx: Transaction, label?: string) => {
      // A previous delete still in its undo window? Commit it before starting a new one.
      flush();

      const rollback = optimisticTx.remove(tx.id);

      const undo = () => {
        const p = pending.current;
        if (!p) return;
        clearTimeout(p.timer);
        pending.current = null;
        p.rollback();
      };

      const timer = setTimeout(() => {
        pending.current = null;
        void commit(tx.id, rollback);
      }, UNDO_WINDOW_MS);

      pending.current = { timer, rollback, id: tx.id };

      showToast({
        type: "undo",
        message: `"${label ?? "Transacción"}" eliminada`,
        action: "Deshacer",
        onAction: undo,
        duration: UNDO_WINDOW_MS,
      });
    },
    [commit, flush, showToast]
  );

  // Don't lose a pending delete if the user leaves the screen.
  useEffect(() => () => flush(), [flush]);

  return { requestDelete };
}
