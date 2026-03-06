-- 013_unique_recurring_month.sql — Prevent duplicate recurring expense applications per month

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_recurring_month
  ON transactions (recurring_id, date_trunc('month', date::timestamp))
  WHERE recurring_id IS NOT NULL;
