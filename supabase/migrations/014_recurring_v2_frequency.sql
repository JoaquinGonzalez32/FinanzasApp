-- 014_recurring_v2_frequency.sql — Recurring v2: weekly / biweekly / yearly support
--
-- ⚠️ REVISIÓN REQUERIDA ANTES DE APLICAR (Joaco corre esto, no Claude):
--
-- 1. DISCREPANCIA DE NOMBRE DE TABLA:
--    La migración 005 creó la tabla como `recurring_expenses`, pero el código TS
--    (src/services/recurringService.ts) consulta `recurring_templates`. Existe un
--    rename aplicado directo a la DB live (probablemente en un slot 008/009 que no
--    quedó versionado en el repo). Esta migración asume que la tabla YA se llama
--    `recurring_templates`. Verificá con:
--        SELECT to_regclass('public.recurring_templates');
--    Si devuelve NULL pero existe `recurring_expenses`, corré primero:
--        ALTER TABLE recurring_expenses RENAME TO recurring_templates;
--    (y considerá versionar ese rename como 008 para cerrar el gap del repo).
--
-- 2. Esta migración es idempotente (IF NOT EXISTS / guards) — segura de re-correr.
--
-- Modelo v2:
--   frequency = 'monthly'  → usa day_of_month (1–28)
--   frequency = 'weekly'   → usa day_of_week (0=Dom … 6=Sáb), aplica cada semana
--   frequency = 'biweekly' → usa day_of_week + anchor_date (define qué ciclo de 14 días)
--   frequency = 'yearly'   → usa day_of_month + month_of_year (1–12)

-- ── Nuevas columnas ──────────────────────────────────────────────────────────
ALTER TABLE recurring_templates
  ADD COLUMN IF NOT EXISTS frequency     text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS day_of_week   integer,
  ADD COLUMN IF NOT EXISTS month_of_year integer,
  ADD COLUMN IF NOT EXISTS anchor_date   date;

-- ── frequency: dominio válido ────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recurring_templates_frequency_check'
  ) THEN
    ALTER TABLE recurring_templates
      ADD CONSTRAINT recurring_templates_frequency_check
      CHECK (frequency IN ('monthly', 'weekly', 'biweekly', 'yearly'));
  END IF;
END $$;

-- ── day_of_week: 0–6 cuando está presente ────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recurring_templates_day_of_week_check'
  ) THEN
    ALTER TABLE recurring_templates
      ADD CONSTRAINT recurring_templates_day_of_week_check
      CHECK (day_of_week IS NULL OR day_of_week BETWEEN 0 AND 6);
  END IF;
END $$;

-- ── month_of_year: 1–12 cuando está presente ─────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recurring_templates_month_of_year_check'
  ) THEN
    ALTER TABLE recurring_templates
      ADD CONSTRAINT recurring_templates_month_of_year_check
      CHECK (month_of_year IS NULL OR month_of_year BETWEEN 1 AND 12);
  END IF;
END $$;

-- ── day_of_month: relajar NOT NULL (weekly/biweekly no lo usan) ───────────────
-- El CHECK original (BETWEEN 1 AND 28) se preserva; solo dejamos pasar NULL.
ALTER TABLE recurring_templates ALTER COLUMN day_of_month DROP NOT NULL;

DO $$ BEGIN
  -- Reemplazar el check viejo por uno que admita NULL, si aplica.
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recurring_expenses_day_of_month_check'
  ) THEN
    ALTER TABLE recurring_templates DROP CONSTRAINT recurring_expenses_day_of_month_check;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recurring_templates_day_of_month_check'
  ) THEN
    ALTER TABLE recurring_templates
      ADD CONSTRAINT recurring_templates_day_of_month_check
      CHECK (day_of_month IS NULL OR day_of_month BETWEEN 1 AND 28);
  END IF;
END $$;

-- ── Coherencia: cada frequency exige sus columnas ────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recurring_templates_frequency_fields_check'
  ) THEN
    ALTER TABLE recurring_templates
      ADD CONSTRAINT recurring_templates_frequency_fields_check
      CHECK (
        (frequency = 'monthly'  AND day_of_month IS NOT NULL) OR
        (frequency = 'weekly'   AND day_of_week  IS NOT NULL) OR
        (frequency = 'biweekly' AND day_of_week  IS NOT NULL AND anchor_date IS NOT NULL) OR
        (frequency = 'yearly'   AND day_of_month IS NOT NULL AND month_of_year IS NOT NULL)
      );
  END IF;
END $$;

-- ── Unicidad anti-duplicado: por FECHA EXACTA, no por mes ────────────────────
-- El índice viejo (idx_unique_recurring_month) bloqueaba >1 aplicación por mes,
-- lo que es incorrecto para weekly/biweekly. Lo reemplazamos por uno por día.
DROP INDEX IF EXISTS idx_unique_recurring_month;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_recurring_date
  ON transactions (recurring_id, date)
  WHERE recurring_id IS NOT NULL;
