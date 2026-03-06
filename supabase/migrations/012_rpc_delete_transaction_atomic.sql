-- 012_rpc_delete_transaction_atomic.sql — Atomic transaction deletion with balance revert

CREATE OR REPLACE FUNCTION delete_transaction_atomic(p_transaction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         uuid := auth.uid();
  v_amount      numeric;
  v_type        text;
  v_account_id  uuid;
  v_cat_account uuid;
  v_effective   uuid;
BEGIN
  -- Lock and read the transaction
  SELECT amount, type, account_id, category_id
  INTO v_amount, v_type, v_account_id, v_cat_account
  FROM transactions
  WHERE id = p_transaction_id AND user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transacción no encontrada' USING ERRCODE = 'P0001';
  END IF;

  -- Resolve effective account (explicit > category fallback)
  v_effective := v_account_id;
  IF v_effective IS NULL AND v_cat_account IS NOT NULL THEN
    SELECT account_id INTO v_effective
    FROM categories
    WHERE id = v_cat_account AND user_id = v_uid;
  END IF;

  -- Delete the transaction
  DELETE FROM transactions WHERE id = p_transaction_id;

  -- Revert account balance
  IF v_effective IS NOT NULL THEN
    -- Lock account row
    PERFORM 1 FROM accounts WHERE id = v_effective FOR UPDATE;

    UPDATE accounts
      SET balance = balance + CASE WHEN v_type = 'income' THEN -v_amount ELSE v_amount END
    WHERE id = v_effective;
  END IF;
END;
$$;
