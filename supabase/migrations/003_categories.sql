-- 003_categories.sql — Categories table

CREATE TABLE IF NOT EXISTS categories (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL DEFAULT auth.uid(),
  name        text NOT NULL,
  icon        text NOT NULL DEFAULT 'category',
  color       text NOT NULL DEFAULT 'primary',
  type        text NOT NULL DEFAULT 'expense',
  sort_order  integer NOT NULL DEFAULT 0,
  account_id  uuid REFERENCES accounts(id) ON DELETE SET NULL,

  CONSTRAINT categories_type_check CHECK (type IN ('expense', 'income'))
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categories' AND policyname = 'Users can manage own categories') THEN
    CREATE POLICY "Users can manage own categories" ON categories
      FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
