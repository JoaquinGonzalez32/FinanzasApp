-- 002_accounts.sql — Accounts table

CREATE TABLE IF NOT EXISTS accounts (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  name             text NOT NULL,
  type             text NOT NULL DEFAULT 'cash',
  icon             text NOT NULL DEFAULT 'account-balance-wallet',
  color            text NOT NULL DEFAULT 'primary',
  balance          numeric NOT NULL DEFAULT 0,
  currency         text NOT NULL DEFAULT 'UYU',
  include_in_total boolean NOT NULL DEFAULT true,
  created_at       timestamptz DEFAULT now(),

  CONSTRAINT accounts_type_check CHECK (type IN ('cash', 'bank', 'credit', 'savings', 'other')),
  CONSTRAINT accounts_currency_check CHECK (currency IN ('UYU', 'USD', 'EUR'))
);

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'accounts' AND policyname = 'Users can manage own accounts') THEN
    CREATE POLICY "Users can manage own accounts" ON accounts
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
