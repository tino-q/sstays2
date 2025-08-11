-- Fix reservations RLS policy to only allow admin users to read reservations
-- This ensures non-admin users cannot see reservation data

-- Drop the existing policy that allows all authenticated users to read
DROP POLICY IF EXISTS "Allow authenticated users to read reservations" ON public.reservations;

-- Create new policy that only allows admin users to read reservations
CREATE POLICY "Allow admin users to read reservations" ON public.reservations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE admin_users.user_id = auth.uid()
        )
    );

-- Create policy for admin users to insert/update reservations
-- (This replaces reliance on service_role for user operations)
CREATE POLICY "Allow admin users to manage reservations" ON public.reservations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE admin_users.user_id = auth.uid()
        )
    );

-- Keep service role access for webhook operations
-- (The existing service role policy remains unchanged)