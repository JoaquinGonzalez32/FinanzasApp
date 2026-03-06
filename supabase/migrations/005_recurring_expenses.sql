-- 005_recurring_expenses.sql — Recurring expenses + recurring_id on transactions

CREATE TABLE IF NOT EXISTS recurring_expenses (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  category_id   uuid REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  account_id    uuid REFERENCES accounts(id) ON DELETE SET NULL,
  amount        numeric NOT NULL CHECK (amount > 0),
  day_of_month  integer NOT NULL CHECK (day_of_month BETWEEN 1 AND 28),
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recurring_expenses' AND policyname = 'Users can manage own recurring expenses') THEN
    CREATE POLICY "Users can manage own recurring expenses" ON recurring_expenses
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Add recurring_id column to transactions (FK to recurring_expenses)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'recurring_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN recurring_id uuid REFERENCES recurring_expenses(id) ON DELETE SET NULL;
  END IF;
END $$;
