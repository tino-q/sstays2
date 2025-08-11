-- Fix RLS policies for tasks table
-- Allow regular users to create and manage their own tasks

-- Drop existing policies
DROP POLICY IF EXISTS "Employees can read assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can read all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Employees can update assigned tasks" ON public.tasks;
DROP POLICY IF EXISTS "Service role can manage tasks" ON public.tasks;

-- Create more permissive policies for testing

-- All authenticated users can read all tasks
CREATE POLICY "Authenticated users can read all tasks" ON public.tasks
    FOR SELECT USING (auth.role() = 'authenticated');

-- All authenticated users can insert tasks
CREATE POLICY "Authenticated users can insert tasks" ON public.tasks
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Users can update tasks they created or are assigned to
CREATE POLICY "Users can update their tasks" ON public.tasks
    FOR UPDATE USING (
        auth.uid() = assigned_to OR 
        auth.uid() = assigned_by OR
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid()
        )
    );

-- Admins can delete tasks
CREATE POLICY "Admins can delete tasks" ON public.tasks
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid()
        )
    );

-- Service role can manage all tasks
CREATE POLICY "Service role can manage tasks" ON public.tasks
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role; 