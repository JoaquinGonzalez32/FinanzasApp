-- 010_rpc_adjust_balance.sql — Atomic balance adjustment (no read-then-write race)

CREATE OR REPLACE FUNCTION adjust_balance(p_account_id uuid, p_delta numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM accounts WHERE id = p_account_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Cuenta no encontrada' USING ERRCODE = 'P0001';
  END IF;

  -- Atomic update + return new balance
  UPDATE accounts
    SET balance = balance + p_delta
  WHERE id = p_account_id
  RETURNING balance INTO v_new_balance;

  RETURN v_new_balance;
END;
$$;
