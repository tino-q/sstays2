-- ====================================================================
-- Supabase migration: admin_users (fresh database)
-- - Columns & types kept EXACTLY as provided
-- - RLS: users can read ONLY their own row
-- - RLS: admins can manage the list (FOR ALL)
-- - No service_role policies needed (service key bypasses RLS)
-- - Grants: no anon visibility; authenticated can reference schema + SELECT (gated by RLS)
-- ====================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_min_messages = warning;

-- =========================================================
-- 1) Table
-- =========================================================
CREATE TABLE public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.admin_users IS
  'Users allowed to access/manage reservations and other protected resources via RLS.';
COMMENT ON COLUMN public.admin_users.user_id IS
  'auth.users.id of an administrator.';

-- PK on user_id already provides an index.

-- =========================================================
-- 2) Row Level Security (RLS)
-- =========================================================
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Users may read ONLY their own admin status
CREATE POLICY "Users read own admin row"
  ON public.admin_users
  FOR SELECT
  USING (auth.uid() = user_id);

-- Helper: definer-rights function to check admin membership without RLS recursion
-- Ensures any policy that needs to check admin status can do so safely.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()
  ) INTO result;
  RETURN COALESCE(result, false);
END;
$$;

-- Admins may manage the list (read/write/delete)
-- Bootstrap the first admin via the Supabase dashboard or service key.
CREATE POLICY "Admins manage admin_users"
  ON public.admin_users
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- (No service_role policy is necessary; service key bypasses RLS.)

-- =========================================================
-- 3) Grants
-- =========================================================
-- No anon schema visibility here (on a fresh DB anon has no USAGE by default).

-- Allow authenticated users and service_role to reference the schema
GRANT USAGE ON SCHEMA public TO authenticated, service_role;

-- Authenticated may attempt SELECT; RLS limits them to their own row unless they are admins
GRANT SELECT ON public.admin_users TO authenticated;

-- No INSERT/UPDATE/DELETE grants for authenticated; only admins (via RLS) and service key (bypass) can modify.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_users TO service_role;
