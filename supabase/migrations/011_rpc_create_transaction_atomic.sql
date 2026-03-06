-- 011_rpc_create_transaction_atomic.sql — Atomic transaction creation with balance check

CREATE OR REPLACE FUNCTION create_transaction_atomic(
  p_amount      numeric,
  p_type        text,
  p_category_id uuid    DEFAULT NULL,
  p_account_id  uuid    DEFAULT NULL,
  p_note        text    DEFAULT NULL,
  p_date        text    DEFAULT NULL,
  p_recurring_id uuid   DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         uuid := auth.uid();
  v_account_id  uuid;
  v_balance     numeric;
  v_tx_id       uuid;
BEGIN
  -- Resolve effective account: explicit > category fallback
  v_account_id := p_account_id;
  IF v_account_id IS NULL AND p_category_id IS NOT NULL THEN
    SELECT account_id INTO v_account_id
    FROM categories
    WHERE id = p_category_id AND user_id = v_uid;
  END IF;

  -- Always store resolved account_id on the transaction
  -- so balance revert works even if category is later deleted

  -- Lock account row + check balance for expenses
  IF v_account_id IS NOT NULL THEN
    SELECT balance INTO v_balance
    FROM accounts
    WHERE id = v_account_id AND user_id = v_uid
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Cuenta no encontrada' USING ERRCODE = 'P0001';
    END IF;

    IF p_type = 'expense' AND v_balance < p_amount THEN
      RAISE EXCEPTION 'Saldo insuficiente. Disponible: $%, Gasto: $%',
        trim(to_char(v_balance, 'FM999G999G999D99')),
        trim(to_char(p_amount,  'FM999G999G999D99'))
      USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Insert transaction
  INSERT INTO transactions (user_id, amount, type, category_id, account_id, note, date, recurring_id)
  VALUES (v_uid, p_amount, p_type, p_category_id, COALESCE(v_account_id, p_account_id), p_note, p_date, p_recurring_id)
  RETURNING id INTO v_tx_id;

  -- Adjust account balance
  IF v_account_id IS NOT NULL THEN
    UPDATE accounts
      SET balance = balance + CASE WHEN p_type = 'income' THEN p_amount ELSE -p_amount END
    WHERE id = v_account_id;
  END IF;

  RETURN v_tx_id;
END;
$$;
