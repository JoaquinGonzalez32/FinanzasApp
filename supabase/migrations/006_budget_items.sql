-- 006_budget_items.sql — Budget items table

CREATE TABLE IF NOT EXISTS budget_items (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  category_id  uuid REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  account_id   uuid REFERENCES accounts(id) ON DELETE SET NULL,
  percentage   numeric NOT NULL DEFAULT 0,  -- stores fixed amount directly (despite column name)
  month        text NOT NULL,               -- YYYY-MM format
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now(),

  CONSTRAINT budget_items_unique_month_category UNIQUE (user_id, month, category_id)
);

ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'budget_items' AND policyname = 'Users can manage own budget items') THEN
    CREATE POLICY "Users can manage own budget items" ON budget_items
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
