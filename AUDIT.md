# Auditoría Técnica Completa — FinanzaApp

**Fecha:** 2026-02-25
**Estado del proyecto:** Beta/MVP
**Stack:** Expo 54 + React Native 0.81 + TypeScript + Supabase + NativeWind

---

## 1. Resumen Ejecutivo

**Estado general:** App funcional con arquitectura simple y coherente, pero con **vulnerabilidades críticas en integridad de datos financieros** y dependencia total de RLS sin verificación.

**Nivel de riesgo:** **ALTO** — Los problemas P0 afectan directamente la confiabilidad de los saldos de cuentas, que es el dato más sensible de una app financiera.

**Principales problemas:**

1. Race condition en `adjustAccountBalance` → saldos pueden corromperse
2. Operaciones no atómicas (insert tx + ajustar saldo = 2 requests separados)
3. Seguridad delegada 100% a RLS sin filtro explícito `user_id` en queries
4. Cero validación server-side (no hay edge functions, triggers, ni constraints)
5. Cero paginación en todas las queries

**Lo positivo:**

- Arquitectura clara y simple (services → hooks → screens)
- Código consistente y bien organizado
- Manejo de errores uniforme en hooks
- Buen manejo de eventos pub/sub para sincronización entre pantallas
- ErrorBoundary en root layout
- Auth correcta con AsyncStorage + autoRefreshToken

---

## 2. Hallazgos Prioritarios

### P0 — CRÍTICOS

#### P0-1: Race condition en actualización de saldos

**Qué sucede:** `adjustAccountBalance()` lee el saldo, calcula el nuevo valor en JS, y escribe. Si dos transacciones se crean simultáneamente, una sobrescribe a la otra.

**Impacto:** Saldos de cuentas inconsistentes con el historial real de transacciones. En una app financiera, esto es el bug más grave posible.

**Evidencia:** `src/services/accountsService.ts:71-90`

```typescript
// Lee balance = 100
const { data: acc } = await supabase.from("accounts").select("balance").eq("id", id).single();
// Calcula en JS
const newBalance = Number(acc.balance) + delta;
// Escribe — pero otro request pudo haber cambiado el balance entre lectura y escritura
await supabase.from("accounts").update({ balance: newBalance }).eq("id", id);
```

**Causa raíz:** Patrón read-modify-write sin atomicidad.

**Solución:** Crear una función RPC en Supabase:

```sql
CREATE OR REPLACE FUNCTION adjust_balance(account_id uuid, delta numeric)
RETURNS void AS $$
  UPDATE accounts SET balance = balance + delta WHERE id = account_id;
$$ LANGUAGE sql SECURITY DEFINER;
```

Llamar con `supabase.rpc('adjust_balance', { account_id: id, delta })`.

---

#### P0-2: Operaciones financieras no atómicas

**Qué sucede:** `createTransaction()` ejecuta 3 operaciones secuenciales separadas:

1. Chequea saldo (lectura)
2. Inserta transacción (escritura)
3. Ajusta saldo de cuenta (lectura + escritura)

Si paso 2 tiene éxito pero paso 3 falla, la transacción queda registrada pero el saldo no se ajusta.

**Impacto:** Desincronización permanente entre transacciones y saldos.

**Evidencia:** `src/services/transactionsService.ts:81-121` — Tres operaciones independientes sin rollback.

**Agravante en `deleteTransaction`** (`transactionsService.ts:124-145`): El saldo se revierte **antes** de eliminar la transacción. Si el delete falla después del ajuste, el saldo ya cambió sin motivo.

**Causa raíz:** No hay transacciones de base de datos. Supabase JS SDK no soporta transacciones nativas.

**Solución:** Crear una función RPC que encapsule toda la lógica:

```sql
CREATE OR REPLACE FUNCTION create_transaction_atomic(
  p_amount numeric, p_type text, p_category_id uuid,
  p_account_id uuid, p_note text, p_date date
) RETURNS json AS $$
DECLARE
  v_account_id uuid;
  v_tx record;
BEGIN
  -- Resolver account_id
  v_account_id := COALESCE(p_account_id,
    (SELECT account_id FROM categories WHERE id = p_category_id));

  -- Validar saldo
  IF v_account_id IS NOT NULL AND p_type = 'expense' THEN
    IF (SELECT balance FROM accounts WHERE id = v_account_id) < p_amount THEN
      RAISE EXCEPTION 'Saldo insuficiente';
    END IF;
  END IF;

  -- Insertar transacción
  INSERT INTO transactions (amount, type, category_id, account_id, note, date)
  VALUES (p_amount, p_type, p_category_id, p_account_id, p_note, p_date)
  RETURNING * INTO v_tx;

  -- Ajustar saldo atómicamente
  IF v_account_id IS NOT NULL THEN
    UPDATE accounts SET balance = balance +
      CASE WHEN p_type = 'income' THEN p_amount ELSE -p_amount END
    WHERE id = v_account_id;
  END IF;

  RETURN row_to_json(v_tx);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

#### P0-3: Saldo derivable almacenado sin mecanismo de reconciliación

**Qué sucede:** El campo `accounts.balance` es un valor derivable (debería ser `initial_balance + SUM(income) - SUM(expenses)`), pero se mantiene manualmente con `adjustAccountBalance`.

**Impacto:** Si en algún momento el saldo se desincroniza (por P0-1 o P0-2), no hay forma automática de detectarlo ni corregirlo.

**Causa raíz:** Denormalización sin mecanismo de reconciliación.

**Solución inmediata:** Agregar un endpoint de reconciliación (ver sección Queries de Diagnóstico).

---

### P1 — ALTO IMPACTO

#### P1-1: Seguridad 100% dependiente de RLS sin defensa en profundidad

**Qué sucede:** Ningún servicio (excepto `profileService`) filtra por `user_id`. Todas las queries confían en que RLS esté correctamente configurado.

**Impacto:** Si una sola política RLS está mal configurada o falta, un usuario autenticado puede ver/modificar datos de todos los usuarios.

**Evidencia:**

- `categoriesService.ts` — `getCategories()`: sin filtro `user_id`
- `accountsService.ts` — `getAccounts()`: sin filtro `user_id`
- `transactionsService.ts` — todas las queries: sin filtro `user_id`
- `budgetService.ts` — `getBudgetItems()`: sin filtro `user_id`
- `accountGoalsService.ts` — `getAccountGoals()`: sin filtro `user_id`

**Causa raíz:** Confianza implícita en RLS como única capa de seguridad.

**Solución:** Agregar `.eq("user_id", (await supabase.auth.getUser()).data.user.id)` a todas las queries como defensa en profundidad.

---

#### P1-2: Cero validación server-side

**Qué sucede:** No existen edge functions, triggers, ni CHECK constraints en la base de datos. Toda la validación ocurre en el cliente (JS).

**Impacto:** Un usuario técnico puede usar la anon key + JWT para enviar requests directas a la API REST de Supabase, bypaseando toda validación:

- Crear transacciones con montos negativos
- Crear transacciones con fechas absurdas
- Crear categorías con nombres de 10,000 caracteres
- Modificar saldos directamente vía `PATCH /accounts`

**Evidencia:** Ningún archivo SQL de migraciones encontrado. Las definiciones de tablas están en comentarios dentro de los servicios.

**Solución (quick win):** Agregar CHECK constraints en Supabase:

```sql
ALTER TABLE transactions ADD CONSTRAINT positive_amount CHECK (amount > 0);
ALTER TABLE transactions ADD CONSTRAINT valid_type CHECK (type IN ('income', 'expense'));
ALTER TABLE accounts ADD CONSTRAINT valid_currency CHECK (currency IN ('UYU', 'USD', 'EUR'));
ALTER TABLE categories ADD CONSTRAINT name_length CHECK (char_length(name) BETWEEN 1 AND 100);
```

---

#### P1-3: Queries sin paginación

**Qué sucede:** Todas las queries devuelven todos los registros sin límite:

- `getYearTransactions()` — puede devolver miles de registros
- `getMonthTransactions()` — cientos por mes
- `getCategories()` — todas las categorías del usuario
- `getCategoryAccountSum()` — **todas** las transacciones de una categoría, filtradas client-side

**Impacto:** Con 1,000+ transacciones mensuales, la app se vuelve lenta en móviles. Con 10,000+ anuales, `getYearTransactions` puede causar OOM.

**Evidencia:** `accountGoalsService.ts:47-61` — `getCategoryAccountSum()` es el peor caso: descarga TODAS las transacciones de una categoría para sumarlas en JS.

**Solución para getCategoryAccountSum:**

```sql
CREATE OR REPLACE FUNCTION get_category_account_sum(p_category_id uuid, p_account_id uuid)
RETURNS numeric AS $$
  SELECT COALESCE(SUM(t.amount), 0)
  FROM transactions t
  LEFT JOIN categories c ON t.category_id = c.id
  WHERE t.category_id = p_category_id
    AND COALESCE(t.account_id, c.account_id) = p_account_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

---

#### P1-4: AuthContext value no memoizado

**Qué sucede:** El objeto `value` del AuthContext se recrea en cada render, forzando re-renders de todos los consumidores.

**Impacto:** Cada cambio de estado en el root layout provoca re-render en cascada de toda la app.

**Evidencia:** `src/context/AuthContext.tsx:61-69` — objeto literal inline sin `useMemo`.

**Solución:**

```typescript
const value = useMemo(() => ({
  session, user: session?.user ?? null, loading, signIn, signUp, signOut,
}), [session, loading]);
```

---

### P2 — MEJORAS RECOMENDADAS

#### P2-1: Event emit sin error handling

**Qué sucede:** `events.ts` ejecuta listeners sincrónicamente con `forEach`. Si un listener lanza error, los demás no se ejecutan.

**Evidencia:** `src/lib/events.ts:10-11`

**Solución:**

```typescript
emit() {
  listeners.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
}
```

---

#### P2-2: Race conditions en hooks por cambios rápidos de parámetros

**Qué sucede:** Si el usuario navega rápido entre meses en `useTransactions`, múltiples fetches quedan en vuelo. El que termine último "gana", aunque no sea el más reciente.

**Impacto:** Posible flash de datos de un mes incorrecto.

**Solución:** Agregar flag `cancelled` en el useEffect:

```typescript
useEffect(() => {
  let cancelled = false;
  fetchData().then(data => { if (!cancelled) setData(data); });
  return () => { cancelled = true; };
}, [deps]);
```

---

#### P2-3: Doble fetch al crear transacción

**Qué sucede:** `createTransaction` en el servicio emite `emitAccountsChange()`. El hook escucha ese evento y hace `fetch()`. Pero el hook `add()` también llama `fetch()` después del create. Resultado: 2 fetches idénticos.

**Evidencia:** `src/hooks/useTransactions.ts:62-66` + `src/services/transactionsService.ts:118`

**Solución:** Que el servicio NO emita eventos. Que sea responsabilidad del hook decidir cuándo refrescar.

---

#### P2-4: Password policy débil

**Qué sucede:** Solo se requiere 6 caracteres mínimo.

**Evidencia:** `app/(auth)/register.js` — `password.length < 6`

**Solución:** Usar la configuración de Supabase Auth para requisitos más fuertes (mín 8 chars).

---

#### P2-5: Campo `percentage` usado para almacenar montos fijos

**Qué sucede:** La columna `budget_items.percentage` almacena un monto fijo en pesos, no un porcentaje.

**Impacto:** Confusión semántica para cualquier desarrollador que lea el esquema.

**Solución:** Renombrar la columna a `amount` en una migración:

```sql
ALTER TABLE budget_items RENAME COLUMN percentage TO amount;
```

---

#### P2-6: No hay `updated_at` en tablas mutables

**Qué sucede:** Solo existe `created_at`. No se trackea cuándo fue la última modificación.

**Impacto:** No se puede hacer cache invalidation por timestamp, ni auditar cambios.

**Solución:**

```sql
ALTER TABLE accounts ADD COLUMN updated_at timestamptz DEFAULT now();
ALTER TABLE categories ADD COLUMN updated_at timestamptz DEFAULT now();
-- + trigger para auto-update
```

---

#### P2-7: Strings hardcodeados en español

**Qué sucede:** Todos los strings de UI están directamente en los screens.

**Impacto:** Imposible internacionalizar sin tocar todos los archivos.

**Solución:** No urgente si no hay planes de i18n. Extraer a constantes para consistencia.

---

## 3. Análisis por Capa

### A) Arquitectura General

| Aspecto | Evaluación |
|---------|-----------|
| Tipo | BaaS (Supabase) + Client-side SPA |
| Separación | Clara: services → hooks → screens |
| Patrones | Service Layer + Custom Hooks + Pub/Sub Events |
| Organización | Bien estructurada: `/src` para lógica, `/app` para UI |
| Coherencia | Sí, consistente en todo el codebase |

**Problema:** Hay lógica de negocio crítica (validación de saldo, cálculo de balance) ejecutándose 100% del lado cliente sin validación server-side.

### B) Base de Datos

| Aspecto | Estado |
|---------|--------|
| Relaciones FK | Correctas con ON DELETE CASCADE/SET NULL |
| user_id default | `auth.uid()` — correcto |
| RLS | Habilitado (según comentarios) |
| CHECK constraints | **Ninguno** |
| Índices custom | **Ninguno visible** (solo PKs) |
| `updated_at` | **Ausente** |
| Soft delete | No implementado (hard delete) |

**Índices recomendados:**

```sql
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_budget_items_month ON budget_items(month);
CREATE INDEX idx_categories_user_type ON categories(user_id, type);
```

### C) Seguridad

| Riesgo | Nivel | Detalle |
|--------|-------|---------|
| Inyección SQL | Nulo | SDK parametrizado, no hay SQL raw |
| XSS | Bajo | React Native sanitiza por defecto |
| Escritura indebida | Medio | Solo RLS protege, sin CHECK constraints |
| Escalamiento de privilegios | Bajo | No hay roles más allá de "usuario" |
| Anon key expuesta | Aceptable | Diseño normal de Supabase, RLS protege |
| Service key en cliente | No presente | Correcto |

### D) Consistencia de Datos

| Problema | Severidad |
|----------|----------|
| Balance calculado vs almacenado sin reconciliación | Crítico |
| adjustAccountBalance race condition | Crítico |
| Delete tx revierte saldo antes de borrar | Alto |
| Optimistic updates sin reconciliación | No aplica (no hay optimistic updates) |

### E) Performance

| Aspecto | Estado |
|---------|--------|
| Queries sin paginación | Todas |
| N+1 queries | `getCategoryAccountSum()` |
| Índices custom | Ninguno |
| Cache client-side | Ninguno |
| Re-renders innecesarios | AuthContext value sin memoizar |
| Doble fetch | En create/delete transaction |

### F) UX Técnica

| Aspecto | Estado |
|---------|--------|
| Loading states | Presentes en casi todas las pantallas |
| Error states | Parciales — faltan en dashboard y month |
| Empty states | Bien implementados |
| Doble submit | Protegido con `disabled={submitting}` |
| Platform handling | Parcial — Alert.alert falta en algunas pantallas web |
| Offline | No implementado |

### G) Escalabilidad

| Usuarios | ¿Funciona? | Cuello de botella |
|----------|------------|-------------------|
| 100 | Sí | Ninguno |
| 1,000 | Sí | `getYearTransactions` empieza a ser lento |
| 10,000 | Parcial | Sin índices, queries degradan |
| 100,000 | No | Sin paginación, sin cache, sin CDN |

**Primera parte en romperse:** `getYearTransactions()` y `getCategoryAccountSum()` — descargan datasets completos al cliente.

---

## 4. Riesgos Futuros

### Técnicos

- Sin migraciones versionadas → esquema no reproducible
- Sin tests → regresiones silenciosas
- Sin logging/monitoring → problemas detectados solo por usuarios

### De escalabilidad

- Todas las queries sin paginación → degradación gradual con uso
- Balance denormalizado sin reconciliación → drift acumulativo

### De seguridad

- RLS como única capa → un error en la policy = data breach total
- Sin rate limiting → vulnerable a scraping automatizado

---

## 5. Queries de Diagnóstico SQL

Ejecutar en Supabase SQL Editor para verificar estado actual:

```sql
-- 1. Verificar que RLS está habilitado en todas las tablas
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- 2. Listar todas las políticas RLS activas
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';

-- 3. Detectar cuentas con saldo inconsistente
SELECT
  a.id, a.name, a.balance AS stored_balance,
  COALESCE(SUM(
    CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END
  ), 0) AS calculated_delta
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id
GROUP BY a.id, a.name, a.balance
HAVING a.balance != COALESCE(SUM(
  CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END
), 0);

-- 4. Detectar transacciones huérfanas (categoría eliminada)
SELECT t.id, t.amount, t.category_id
FROM transactions t
LEFT JOIN categories c ON t.category_id = c.id
WHERE t.category_id IS NOT NULL AND c.id IS NULL;

-- 5. Detectar budget items huérfanos
SELECT bi.id, bi.category_id, bi.month
FROM budget_items bi
LEFT JOIN categories c ON bi.category_id = c.id
WHERE c.id IS NULL;

-- 6. Verificar tablas sin índices (además de PK)
SELECT t.relname AS table_name,
  COUNT(i.relname) - 1 AS extra_indexes
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
WHERE t.relkind = 'r' AND t.relnamespace = 'public'::regnamespace
GROUP BY t.relname
ORDER BY extra_indexes;

-- 7. Verificar CHECK constraints existentes
SELECT conname, conrelid::regclass, consrc
FROM pg_constraint
WHERE contype = 'c' AND connamespace = 'public'::regnamespace;
```

---

## 6. Archivos Clave a Revisar

| Archivo | Prioridad | Motivo |
|---------|----------|--------|
| `src/services/accountsService.ts` | P0 | Race condition en adjustAccountBalance |
| `src/services/transactionsService.ts` | P0 | Operaciones no atómicas |
| `src/services/accountGoalsService.ts` | P1 | N+1 query + filtrado client-side |
| `src/context/AuthContext.tsx` | P1 | Value sin memoizar |
| `src/lib/events.ts` | P2 | Emit sin error handling |
| `src/hooks/useTransactions.ts` | P2 | Race conditions, doble fetch |
| Todos los servicios | P1 | Agregar filtro user_id |

---

## 7. Plan de Acción (Beta/MVP)

### Semana 1 — Proteger integridad de datos

| # | Acción | Esfuerzo | Archivos |
|---|--------|----------|----------|
| 1 | Crear RPC `adjust_balance` atómico | 30 min | Supabase SQL + `accountsService.ts` |
| 2 | Crear RPC `create_transaction_atomic` | 1-2h | Supabase SQL + `transactionsService.ts` |
| 3 | Crear RPC `delete_transaction_atomic` | 1h | Supabase SQL + `transactionsService.ts` |
| 4 | Agregar CHECK constraints | 15 min | Supabase SQL |
| 5 | Verificar RLS activo en TODAS las tablas | 10 min | Query diagnóstico #1 y #2 |

### Semana 2 — Quick wins de calidad

| # | Acción | Esfuerzo | Archivos |
|---|--------|----------|----------|
| 6 | Memoizar AuthContext value | 5 min | `AuthContext.tsx` |
| 7 | Error-safe event emit | 5 min | `events.ts` |
| 8 | Fix cancelled flag en hooks (stale data) | 30 min | Todos los hooks |
| 9 | Eliminar doble fetch en create/delete | 15 min | `useTransactions.ts` |
| 10 | Reemplazar `getCategoryAccountSum` con RPC | 30 min | Supabase SQL + `accountGoalsService.ts` |

### Cuando escales — No urgente ahora

- Agregar índices en tablas principales
- Implementar paginación (cuando tengas 1000+ transacciones)
- Agregar `user_id` explícito en queries como safety net
- Agregar `updated_at` en tablas
- Renombrar `percentage` → `amount`
- i18n de strings

### Lo que NO necesitás hacer ahora

- Edge functions complejas
- Cache layer
- Optimistic updates
- Rate limiting
- Tests automatizados (útil pero no bloqueante en beta)
- i18n
