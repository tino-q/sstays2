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
  new_values JSONB,
  -- Audit context fields
  user_agent TEXT,
  ip_address INET,
  context JSONB
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
  audit_context JSONB;
  user_agent_val TEXT;
  ip_address_val INET;
  table_name_val TEXT;
  record_id_val TEXT;
BEGIN
  -- Get audit context from session
  audit_context := CASE 
    WHEN current_setting('app.audit_context', true) = '' THEN NULL
    ELSE current_setting('app.audit_context', true)::jsonb
  END;
  user_agent_val := CASE 
    WHEN current_setting('app.user_agent', true) = '' THEN NULL
    ELSE current_setting('app.user_agent', true)
  END;
  ip_address_val := CASE 
    WHEN current_setting('app.ip_address', true) = '' THEN NULL
    ELSE current_setting('app.ip_address', true)::inet
  END;
  
  -- Get table name and record ID
  table_name_val := TG_TABLE_NAME;
  
  IF TG_OP = 'INSERT' THEN
    record_id_val := NEW.id::text;
    INSERT INTO public.audit_log(
      table_name, record_id, action_type, changed_by, new_values,
      user_agent, ip_address, context
    )
    VALUES (
      table_name_val, record_id_val, 'INSERT', public.current_audit_user(), to_jsonb(NEW),
      user_agent_val, ip_address_val, audit_context
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    record_id_val := OLD.id::text;
    INSERT INTO public.audit_log(
      table_name, record_id, action_type, changed_by, old_values,
      user_agent, ip_address, context
    )
    VALUES (
      table_name_val, record_id_val, 'DELETE', public.current_audit_user(), to_jsonb(OLD),
      user_agent_val, ip_address_val, audit_context
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
      table_name, record_id, action_type, changed_by, changed_fields, old_values, new_values,
      user_agent, ip_address, context
    )
    VALUES (
      table_name_val, record_id_val, 'UPDATE', public.current_audit_user(), changed_fields, old_row, new_row,
      user_agent_val, ip_address_val, audit_context
    );

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- =========================================================
-- 4) Audit context function
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_audit_context(
  ip_address INET DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  context JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Clear or set ip_address
  IF ip_address IS NOT NULL THEN
    PERFORM set_config('app.ip_address', ip_address::text, false);
  ELSE
    PERFORM set_config('app.ip_address', '', false);
  END IF;
  
  -- Clear or set user_agent
  IF user_agent IS NOT NULL THEN
    PERFORM set_config('app.user_agent', user_agent, false);
  ELSE
    PERFORM set_config('app.user_agent', '', false);
  END IF;
  
  -- Clear or set context
  IF context IS NOT NULL THEN
    PERFORM set_config('app.audit_context', context::text, false);
  ELSE
    PERFORM set_config('app.audit_context', '', false);
  END IF;
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
GRANT EXECUTE ON FUNCTION public.set_audit_context TO authenticated, service_role;

-- Grant access to auth.users for the view
GRANT SELECT ON auth.users TO authenticated, service_role;
