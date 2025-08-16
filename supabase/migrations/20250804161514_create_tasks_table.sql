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

-- =========================================================
-- 1) task_status enum (idempotent)
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE task_status AS ENUM ('unassigned', 'assigned', 'in_progress', 'accepted', 'completed', 'cancelled');
  END IF;
END$$;

-- =========================================================
-- 2) tasks table (columns & types kept EXACTLY as provided)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id TEXT NOT NULL REFERENCES public.listings(id), -- References listings table (nickname)
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
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Light data-quality checks (no type/nullability changes)
  CONSTRAINT tasks_schedule_present CHECK (scheduled_datetime IS NOT NULL),
  CONSTRAINT tasks_finished_after_started CHECK (finished_at IS NULL OR started_at IS NULL OR finished_at > started_at)
);

COMMENT ON TABLE public.tasks IS 'Employee task management.';
COMMENT ON COLUMN public.tasks.listing_id IS 'Foreign key to listings table (nickname).';
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
    RAISE EXCEPTION 'Only admins may modify task fields other than status/accepted_at/started_at/finished_at/completed_at';
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
-- 6) Assignment status trigger: auto-update status based on assignment changes
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_task_status_on_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only update status if assigned_to actually changed
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    -- Case 1: Task was unassigned and now has someone assigned to it
    IF OLD.assigned_to IS NULL AND NEW.assigned_to IS NOT NULL THEN
      NEW.status = 'assigned';
    -- Case 2: Task was assigned and now is unassigned
    ELSIF OLD.assigned_to IS NOT NULL AND NEW.assigned_to IS NULL THEN
      NEW.status = 'unassigned';
    -- Case 3: Task was reassigned to a different cleaner - reset to 'assigned'
    ELSIF OLD.assigned_to IS NOT NULL AND NEW.assigned_to IS NOT NULL THEN
      NEW.status = 'assigned';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_update_status_on_assignment ON public.tasks;
CREATE TRIGGER trg_tasks_update_status_on_assignment
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_task_status_on_assignment();

COMMENT ON FUNCTION public.update_task_status_on_assignment() IS 
'Automatically updates task status based on assignment changes:
- assigned_to: NULL → NOT NULL → status becomes "assigned"
- assigned_to: NOT NULL → NULL → status becomes "unassigned"
- assigned_to: NOT NULL → NOT NULL (different user) → status becomes "assigned" (reassignment)';

-- =========================================================
-- 6.1) Task progress tracking triggers for started_at/finished_at
-- =========================================================

-- Function to handle started_at and finished_at status changes
CREATE OR REPLACE FUNCTION public.handle_task_progress_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Handle started_at changes
  IF OLD.started_at IS DISTINCT FROM NEW.started_at THEN
    -- Setting started_at moves to in_progress (only if currently assigned)
    IF NEW.started_at IS NOT NULL AND OLD.started_at IS NULL THEN
      IF NEW.status != 'assigned' THEN
        RAISE EXCEPTION 'started_at can only be set when task status is assigned';
      END IF;
      NEW.status = 'in_progress';
    -- Removing started_at moves back to assigned  
    ELSIF NEW.started_at IS NULL AND OLD.started_at IS NOT NULL THEN
      NEW.status = 'assigned';
      -- Also clear finished_at if started_at is removed
      NEW.finished_at = NULL;
    END IF;
  END IF;

  -- Handle finished_at changes
  IF OLD.finished_at IS DISTINCT FROM NEW.finished_at THEN
    -- Setting finished_at moves to completed (only if currently in_progress)
    IF NEW.finished_at IS NOT NULL AND OLD.finished_at IS NULL THEN
      IF NEW.status != 'in_progress' OR NEW.started_at IS NULL THEN
        RAISE EXCEPTION 'finished_at can only be set when task is in_progress and started_at is set';
      END IF;
      IF NEW.finished_at <= NEW.started_at THEN
        RAISE EXCEPTION 'finished_at must be later than started_at';
      END IF;
      NEW.status = 'completed';
      NEW.completed_at = NEW.finished_at;
    -- Removing finished_at moves back to in_progress
    ELSIF NEW.finished_at IS NULL AND OLD.finished_at IS NOT NULL THEN
      IF NEW.started_at IS NOT NULL THEN
        NEW.status = 'in_progress';
      ELSE
        NEW.status = 'assigned';
      END IF;
      NEW.completed_at = NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_handle_progress_status ON public.tasks;
CREATE TRIGGER trg_tasks_handle_progress_status
  BEFORE UPDATE OF started_at, finished_at ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_progress_status();

-- Function to validate task status transitions
CREATE OR REPLACE FUNCTION public.validate_task_status_transitions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Only validate when status actually changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    
    SELECT (auth.role() = 'service_role') OR public.is_admin() INTO is_admin;
    
    -- Admins can make any status transition
    IF NOT is_admin THEN
      -- Non-admins can only update tasks assigned to them
      IF NEW.assigned_to != auth.uid() THEN
        RAISE EXCEPTION 'You can only update tasks assigned to you';
      END IF;
      
      -- Validate specific status transitions for cleaners
      CASE 
        -- Can accept assigned tasks
        WHEN OLD.status = 'assigned' AND NEW.status = 'accepted' THEN
          NULL; -- Valid transition
        
        -- Can start assigned tasks (triggers set this automatically)
        WHEN OLD.status = 'assigned' AND NEW.status = 'in_progress' THEN
          NULL; -- Valid transition
        
        -- Can complete in_progress tasks (triggers set this automatically)  
        WHEN OLD.status = 'in_progress' AND NEW.status = 'completed' THEN
          NULL; -- Valid transition
        
        -- Can go back from in_progress to assigned (triggers set this automatically)
        WHEN OLD.status = 'in_progress' AND NEW.status = 'assigned' THEN
          NULL; -- Valid transition
        
        -- Can cancel/reject accepted tasks (move back to assigned)
        WHEN OLD.status = 'accepted' AND NEW.status = 'assigned' THEN
          NULL; -- Valid transition
        
        -- No status change is always valid
        WHEN OLD.status = NEW.status THEN
          NULL; -- Valid transition
        
        -- All other transitions are invalid for cleaners
        ELSE
          RAISE EXCEPTION 'Invalid status transition from % to % for cleaner', OLD.status, NEW.status;
      END CASE;
    END IF;
    
    -- Set appropriate timestamps based on new status
    CASE NEW.status
      WHEN 'accepted' THEN
        NEW.accepted_at = COALESCE(NEW.accepted_at, NOW());
      WHEN 'assigned' THEN
        -- If moving back to assigned from accepted, clear accepted_at
        IF OLD.status = 'accepted' THEN
          NEW.accepted_at = NULL;
        END IF;
      ELSE
        NULL; -- Other cases handled by other triggers
    END CASE;
    
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_validate_status_transitions ON public.tasks;
CREATE TRIGGER trg_tasks_validate_status_transitions
  BEFORE UPDATE OF status ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_task_status_transitions();

-- Function to send notification via edge function
CREATE OR REPLACE FUNCTION public.notify_task_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  payload jsonb;
BEGIN
  -- Only trigger for status changes that cleaners would make
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    
    -- Build notification payload
    payload := jsonb_build_object(
      'task_id', NEW.id,
      'old_status', COALESCE(OLD.status::text, 'null'),
      'new_status', NEW.status::text,
      'listing_id', NEW.listing_id,
      'task_type', NEW.task_type,
      'title', NEW.title,
      'scheduled_datetime', NEW.scheduled_datetime::text,
      'assigned_to', NEW.assigned_to::text
    );
    
    -- Log notification for processing (edge function call can be added later)
    RAISE LOG 'Task status change notification: task_id=%, old_status=%, new_status=%, payload=%', 
      NEW.id, OLD.status, NEW.status, payload::text;
    
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_notify_status_change ON public.tasks;
CREATE TRIGGER trg_tasks_notify_status_change
  AFTER UPDATE OF status, accepted_at, started_at, finished_at, completed_at ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_status_change();

COMMENT ON FUNCTION public.handle_task_progress_status() IS 'Automatically manages status changes when started_at/finished_at are set/cleared';
COMMENT ON FUNCTION public.validate_task_status_transitions() IS 'Validates that task status transitions are allowed for the current user';  
COMMENT ON FUNCTION public.notify_task_status_change() IS 'Logs task status changes for notification processing';

-- =========================================================
-- 7) Row Level Security (RLS)
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
-- 8) Grants
--   - No anon schema visibility here (fresh DB default).
--   - authenticated gets schema usage + CRUD (RLS governs actual access).
--   - service_role gets full CRUD for backend/webhooks.
-- =========================================================
GRANT USAGE ON SCHEMA public TO authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO service_role;
