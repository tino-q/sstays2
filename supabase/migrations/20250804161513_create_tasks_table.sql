-- ====================================================================
-- Supabase migration: tasks + task_status enum (fresh database)
-- - Columns & types kept EXACTLY as provided
-- - Idempotent enum creation
-- - updated_at trigger
-- - Guardrail trigger (non-admins can only change status/accepted_at/completed_at)
--   * Treats service_role as admin
--   * Ignores updated_at (set by separate trigger)
-- - RLS: admins manage all; employees read/update own assignments
-- - Grants: authenticated + service_role; RLS still governs authenticated
-- ====================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_min_messages = warning;

-- Needed for gen_random_uuid() on some Postgres setups (Supabase usually has it)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure admin_users exists (no-op if created elsewhere)
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- 1) task_status enum (idempotent)
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE task_status AS ENUM ('unassigned', 'assigned', 'accepted', 'completed', 'cancelled');
  END IF;
END$$;

-- =========================================================
-- 2) tasks table (columns & types kept EXACTLY as provided)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id BIGINT NOT NULL,                              -- References hardcoded listings map
  reservation_id TEXT REFERENCES public.reservations(id),  -- Optional link to existing reservations
  task_type TEXT NOT NULL,                                 -- e.g., 'cleaning', 'maintenance', 'sheets' (not enforced)
  title TEXT NOT NULL,
  description TEXT,
  scheduled_datetime TIMESTAMPTZ NOT NULL,
  status task_status DEFAULT 'unassigned',
  assigned_to UUID REFERENCES auth.users(id),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Light data-quality checks (no type/nullability changes)
  CONSTRAINT tasks_listing_id_check CHECK (listing_id > 0),
  CONSTRAINT tasks_schedule_present CHECK (scheduled_datetime IS NOT NULL)
);

COMMENT ON TABLE public.tasks IS 'Employee task management.';
COMMENT ON COLUMN public.tasks.listing_id IS 'External/hardcoded listing identifier used by the ops app.';
COMMENT ON COLUMN public.tasks.reservation_id IS 'Optional FK to reservations(id).';
COMMENT ON COLUMN public.tasks.task_type IS 'Free-form type label (e.g., cleaning, maintenance, sheets).';
COMMENT ON COLUMN public.tasks.status IS 'Task workflow status.';

-- =========================================================
-- 3) Indexes
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to           ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status                ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_datetime    ON public.tasks(scheduled_datetime);
CREATE INDEX IF NOT EXISTS idx_tasks_listing_id            ON public.tasks(listing_id);
CREATE INDEX IF NOT EXISTS idx_tasks_reservation_id        ON public.tasks(reservation_id);
-- Helpful composite for dashboards (assignment + time)
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status_time  ON public.tasks(assigned_to, status, scheduled_datetime);

-- =========================================================
-- 4) updated_at trigger
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_set_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_set_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 5) Guardrail trigger: limit non-admin updates to safe fields
--    Non-admins may only change: status, accepted_at, completed_at
--    Treat service_role as admin; ignore updated_at changes.
-- =========================================================
CREATE OR REPLACE FUNCTION public.enforce_task_update_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  SELECT (auth.role() = 'service_role') OR public.is_admin() INTO is_admin;

  IF is_admin THEN
    RETURN NEW; -- Admins/service_role can update anything
  END IF;

  -- Only allow limited fields for non-admins; do NOT check updated_at (set by another trigger)
  IF NEW.assigned_to            IS DISTINCT FROM OLD.assigned_to
     OR NEW.title               IS DISTINCT FROM OLD.title
     OR NEW.description         IS DISTINCT FROM OLD.description
     OR NEW.task_type           IS DISTINCT FROM OLD.task_type
     OR NEW.listing_id          IS DISTINCT FROM OLD.listing_id
     OR NEW.reservation_id      IS DISTINCT FROM OLD.reservation_id
     OR NEW.scheduled_datetime  IS DISTINCT FROM OLD.scheduled_datetime
     OR NEW.assigned_by         IS DISTINCT FROM OLD.assigned_by
     OR NEW.assigned_at         IS DISTINCT FROM OLD.assigned_at
     OR NEW.created_at          IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Only admins may modify task fields other than status/accepted_at/completed_at';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_enforce_update_columns ON public.tasks;
CREATE TRIGGER trg_tasks_enforce_update_columns
BEFORE UPDATE ON public.tasks
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION public.enforce_task_update_columns();

-- =========================================================
-- 6) Row Level Security (RLS)
-- =========================================================
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Admins manage all actions with a single policy
CREATE POLICY "Admins manage tasks"
  ON public.tasks
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Employees can read only tasks assigned to them
CREATE POLICY "Employees read own assignments"
  ON public.tasks
  FOR SELECT
  USING (assigned_to = auth.uid());

-- Employees can update only tasks assigned to them
-- (Column-level restriction enforced by the trigger above.)
CREATE POLICY "Employees update own assignments"
  ON public.tasks
  FOR UPDATE
  USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- No service_role policy needed; service key bypasses RLS.

-- =========================================================
-- 7) Grants
--   - No anon schema visibility here (fresh DB default).
--   - authenticated gets schema usage + CRUD (RLS governs actual access).
--   - service_role gets full CRUD for backend/webhooks.
-- =========================================================
GRANT USAGE ON SCHEMA public TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO service_role;
