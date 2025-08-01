-- Create a simple function to get PostgreSQL version
-- This can be called via RPC from Edge Functions

CREATE OR REPLACE FUNCTION public.get_db_version()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT version();
$$;

-- Grant execute permission to anon role so Edge Functions can call it
GRANT EXECUTE ON FUNCTION public.get_db_version() TO anon;
GRANT EXECUTE ON FUNCTION public.get_db_version() TO authenticated;