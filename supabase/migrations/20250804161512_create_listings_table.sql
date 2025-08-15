-- Create listings table for Airbnb property management
CREATE TABLE IF NOT EXISTS public.listings (
  id TEXT PRIMARY KEY, -- nickname as primary key
  airbnb_id TEXT NOT NULL UNIQUE, -- Airbnb listing ID as text
  airbnb_payload JSONB NOT NULL, -- Complete Airbnb listing data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_listings_airbnb_id ON public.listings(airbnb_id);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON public.listings(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- Create updated_at trigger
CREATE TRIGGER set_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Enable Row Level Security
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Policy for admins: Full access (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admins have full access to listings" ON public.listings
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Policy for cleaners: Read-only access
CREATE POLICY "Cleaners can view all listings" ON public.listings
  FOR SELECT
  TO authenticated
  USING (is_cleaner());

-- Policy for unassigned/unapproved: No access
-- (No policies created for these roles, so they get no access by default)

-- Grant table permissions to authenticated users
-- (RLS policies will control actual access)
GRANT ALL ON public.listings TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;