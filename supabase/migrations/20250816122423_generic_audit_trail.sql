-- ====================================================================
-- Supabase migration: Generic Audit Trail Setup
-- ====================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_min_messages = warning;

-- =========================================================
-- 1) Generic audit log table
-- =========================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('INSERT','UPDATE','DELETE')),
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_fields TEXT[] NOT NULL DEFAULT '{}',
  old_values JSONB,
  new_values JSONB
);

COMMENT ON TABLE public.audit_log IS 'Generic audit trail for all table changes (insert, update, delete).';

CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON public.audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_by ON public.audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON public.audit_log(changed_at DESC);

-- =========================================================
-- 2) Helper: who did the change (auth.uid() or service_role)
-- =========================================================
CREATE OR REPLACE FUNCTION public.current_audit_user()
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  uid uuid;
BEGIN
  -- Check if we're in service role context
  IF auth.role() = 'service_role' THEN
    RETURN NULL;
  END IF;

  BEGIN
    uid := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    uid := NULL;
  END;

  RETURN uid;
END;
$$;

-- =========================================================
-- 3) Generic audit trigger function
-- =========================================================
CREATE OR REPLACE FUNCTION public.audit_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changed_fields TEXT[];
  old_row JSONB;
  new_row JSONB;
  table_name_val TEXT;
  record_id_val TEXT;
BEGIN
  -- Get table name and record ID
  table_name_val := TG_TABLE_NAME;
  
  IF TG_OP = 'INSERT' THEN
    record_id_val := NEW.id::text;
    INSERT INTO public.audit_log(
      table_name, record_id, action_type, changed_by, new_values
    )
    VALUES (
      table_name_val, record_id_val, 'INSERT', public.current_audit_user(), to_jsonb(NEW)
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    record_id_val := OLD.id::text;
    INSERT INTO public.audit_log(
      table_name, record_id, action_type, changed_by, old_values
    )
    VALUES (
      table_name_val, record_id_val, 'DELETE', public.current_audit_user(), to_jsonb(OLD)
    );
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    record_id_val := NEW.id::text;
    old_row := to_jsonb(OLD);
    new_row := to_jsonb(NEW);

    SELECT array_agg(key) INTO changed_fields
    FROM jsonb_each_text(new_row)
    WHERE old_row->>key IS DISTINCT FROM new_row->>key;

    INSERT INTO public.audit_log(
      table_name, record_id, action_type, changed_by, changed_fields, old_values, new_values
    )
    VALUES (
      table_name_val, record_id_val, 'UPDATE', public.current_audit_user(), changed_fields, old_row, new_row
    );

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;



-- =========================================================
-- 4) RLS for audit tables
-- =========================================================
-- Enable RLS on audit log table
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can see all audit logs
CREATE POLICY "Admins can view all audit logs" ON public.audit_log
  FOR SELECT
  USING (public.is_admin());

-- Policy: Service role can see all audit logs
CREATE POLICY "Service role can view all audit logs" ON public.audit_log
  FOR SELECT
  USING (auth.role() = 'service_role');

-- Policy: Allow audit trigger to insert records (bypass RLS for inserts)
CREATE POLICY "Allow audit trigger inserts" ON public.audit_log
  FOR INSERT
  WITH CHECK (true);

-- =========================================================
-- 5) Grants
-- =========================================================
GRANT SELECT ON public.audit_log TO authenticated, service_role;

-- Grant access to auth.users for the view and joins
GRANT SELECT ON auth.users TO authenticated, service_role;
