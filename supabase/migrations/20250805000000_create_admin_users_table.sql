-- Create admin users table to identify users with admin privileges
-- This table will be manually populated from the Supabase dashboard

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on user_id is automatically created since it's the primary key

-- Add RLS policies for security
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read only their own admin status
CREATE POLICY "Allow users to read own admin status" ON public.admin_users
    FOR SELECT USING (auth.uid() = user_id);

-- Allow service role to manage admin users
CREATE POLICY "Allow service role to manage admin users" ON public.admin_users
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON public.admin_users TO authenticated;
GRANT ALL ON public.admin_users TO service_role;