-- 004_transactions.sql — Transactions table (without recurring_id FK, added in 005)

CREATE TABLE IF NOT EXISTS transactions (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  amount       numeric NOT NULL CHECK (amount > 0),
  type         text NOT NULL,
  category_id  uuid REFERENCES categories(id) ON DELETE SET NULL,
  account_id   uuid REFERENCES accounts(id) ON DELETE SET NULL,
  note         text,
  date         text NOT NULL, -- YYYY-MM-DD
  created_at   timestamptz DEFAULT now(),

  CONSTRAINT transactions_type_check CHECK (type IN ('expense', 'income'))
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Users can manage own transactions') THEN
    CREATE POLICY "Users can manage own transactions" ON transactions
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
