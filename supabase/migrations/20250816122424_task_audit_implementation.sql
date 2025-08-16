-- ====================================================================
-- Supabase migration: Task Audit Implementation
-- ====================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_min_messages = warning;

-- =========================================================
-- 1) Attach audit trigger to tasks table
-- =========================================================
DROP TRIGGER IF EXISTS trg_tasks_audit ON public.tasks;

CREATE TRIGGER trg_tasks_audit
AFTER INSERT OR UPDATE OR DELETE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.audit_changes();
