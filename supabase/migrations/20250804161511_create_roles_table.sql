-- ====================================================================
-- Supabase migration: roles table
-- - Single table for user roles: "admin" | "cleaner"
-- - No entry = "unapproved" user
-- - RLS: users can read ONLY their own role
-- - RLS: admins can manage all roles
-- ====================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_min_messages = warning;

-- =========================================================
-- 1) Create user_role enum type
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'cleaner', 'unassigned');
  END IF;
END$$;

COMMENT ON TYPE user_role IS
  'Enumeration of possible user roles in the system';

-- =========================================================
-- 2) Table
-- =========================================================
CREATE TABLE public.roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.roles IS
  'User roles table. If no entry exists, user is unapproved.';
COMMENT ON COLUMN public.roles.user_id IS
  'auth.users.id of the user';
COMMENT ON COLUMN public.roles.role IS
  'User role: admin or cleaner';

-- =========================================================
-- 2) Updated timestamp trigger function and trigger
-- =========================================================
-- Create the set_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_roles_set_updated_at ON public.roles;
CREATE TRIGGER trg_roles_set_updated_at
BEFORE UPDATE ON public.roles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 3) Helper functions (needed before RLS policies)
-- =========================================================

-- Helper function to check if user is admin
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
    SELECT 1 FROM public.roles r WHERE r.user_id = auth.uid() AND r.role = 'admin'::user_role
  ) INTO result;
  RETURN COALESCE(result, false);
END;
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'Helper function to check if current user has admin role.';

-- =========================================================
-- 4) Row Level Security (RLS)
-- =========================================================
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Users may read ONLY their own role
CREATE POLICY "Users read own role"
  ON public.roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins may manage all roles (read/write/delete)
CREATE POLICY "Admins manage roles"
  ON public.roles
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =========================================================
-- 5) Grants
-- =========================================================
-- Allow authenticated users and service_role to reference the schema
GRANT USAGE ON SCHEMA public TO authenticated, service_role;

-- Authenticated may attempt SELECT; RLS limits them to their own row unless they are admins
GRANT SELECT ON public.roles TO authenticated;

-- Admins (via RLS) and service key (bypass) can modify
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roles TO service_role;

-- =========================================================
-- 6) Additional helper functions
-- =========================================================

-- Helper function to check if user is cleaner
CREATE OR REPLACE FUNCTION public.is_cleaner()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.roles r WHERE r.user_id = auth.uid() AND r.role = 'cleaner'::user_role
  ) INTO result;
  RETURN COALESCE(result, false);
END;
$$;

COMMENT ON FUNCTION public.is_cleaner() IS
  'Helper function to check if current user has cleaner role.';

-- Helper function to check if user is approved (has any role)
CREATE OR REPLACE FUNCTION public.is_approved()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.roles r WHERE r.user_id = auth.uid()
  ) INTO result;
  RETURN COALESCE(result, false);
END;
$$;

COMMENT ON FUNCTION public.is_approved() IS
  'Helper function to check if current user has been approved (has any role).';

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_val user_role;
BEGIN
  SELECT role INTO user_role_val
  FROM public.roles r 
  WHERE r.user_id = auth.uid();
  
  RETURN COALESCE(user_role_val::text, 'unapproved');
END;
$$;

COMMENT ON FUNCTION public.get_user_role() IS
  'Helper function to get current user role. Returns "unapproved" if no role assigned.';

-- =========================================================
-- 7) Auto-assign unassigned role on user registration
-- =========================================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.roles (user_id, role)
  VALUES (NEW.id, 'unassigned'::user_role);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Automatically assigns "unassigned" role to new users upon registration.';

-- Trigger to call the function when a new user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();