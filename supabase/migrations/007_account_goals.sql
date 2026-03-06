-- 007_account_goals.sql — Account goals table

CREATE TABLE IF NOT EXISTS account_goals (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  account_id     uuid REFERENCES accounts(id) ON DELETE CASCADE NOT NULL,
  goal_type      text NOT NULL DEFAULT 'balance',
  category_id    uuid REFERENCES categories(id) ON DELETE CASCADE,
  target_amount  numeric NOT NULL CHECK (target_amount > 0),
  target_date    text,  -- YYYY-MM-DD or null
  created_at     timestamptz DEFAULT now(),

  CONSTRAINT account_goals_type_check CHECK (goal_type IN ('balance', 'category'))
);

ALTER TABLE account_goals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'account_goals' AND policyname = 'Users can manage own account goals') THEN
    CREATE POLICY "Users can manage own account goals" ON account_goals
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
