-- Create tasks table for employee task management
-- Based on the data model requirements

-- Create task status enum
CREATE TYPE task_status AS ENUM ('unassigned', 'assigned', 'accepted', 'completed', 'cancelled');

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id BIGINT NOT NULL, -- References hardcoded listings map
  reservation_id TEXT REFERENCES public.reservations(id), -- Optional link to existing reservations
  task_type TEXT NOT NULL, -- eg. 'cleaning', 'maintenance', 'sheets' (not enforced)
  title TEXT NOT NULL,
  description TEXT,
  scheduled_datetime TIMESTAMPTZ NOT NULL,
  status task_status DEFAULT 'unassigned',
  assigned_to UUID REFERENCES auth.users(id),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_datetime ON public.tasks(scheduled_datetime);
CREATE INDEX IF NOT EXISTS idx_tasks_listing_id ON public.tasks(listing_id);
CREATE INDEX IF NOT EXISTS idx_tasks_reservation_id ON public.tasks(reservation_id);

-- Add RLS policies for security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Employees can read their assigned tasks
CREATE POLICY "Employees can read assigned tasks" ON public.tasks
    FOR SELECT USING (assigned_to = auth.uid());

-- Admins can read all tasks
CREATE POLICY "Admins can read all tasks" ON public.tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid()
        )
    );

-- Admins can insert/update tasks
CREATE POLICY "Admins can manage tasks" ON public.tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.admin_users 
            WHERE user_id = auth.uid()
        )
    );

-- Employees can update their assigned tasks (accept, complete)
CREATE POLICY "Employees can update assigned tasks" ON public.tasks
    FOR UPDATE USING (assigned_to = auth.uid());

-- Service role can manage all tasks
CREATE POLICY "Service role can manage tasks" ON public.tasks
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT, UPDATE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role; 