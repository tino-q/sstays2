-- Create reservations table for Airbnb reservation data from Mailgun webhooks
-- Based on the POC parser output structure

CREATE TABLE IF NOT EXISTS public.reservations (
  id TEXT PRIMARY KEY, -- Airbnb reservation ID (e.g., "HM4SNC5CAP")
  property_id TEXT,
  property_name TEXT,
  status TEXT DEFAULT 'confirmed',
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  nights INTEGER,
  guest_name TEXT NOT NULL,
  guest_location TEXT,
  guest_message TEXT,
  party_size INTEGER,
  pricing_nightly_rate DECIMAL(10,2),
  pricing_subtotal DECIMAL(10,2),
  pricing_cleaning_fee DECIMAL(10,2),
  pricing_guest_service_fee DECIMAL(10,2),
  pricing_guest_total DECIMAL(10,2),
  pricing_host_service_fee DECIMAL(10,2),
  pricing_host_payout DECIMAL(10,2),
  thread_id TEXT,
  ai_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_reservations_check_in ON public.reservations(check_in);
CREATE INDEX IF NOT EXISTS idx_reservations_property_id ON public.reservations(property_id);
CREATE INDEX IF NOT EXISTS idx_reservations_created_at ON public.reservations(created_at);

-- Add RLS policies for security
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all reservations
CREATE POLICY "Allow authenticated users to read reservations" ON public.reservations
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow service role to insert/update reservations (for webhook endpoint)
CREATE POLICY "Allow service role to manage reservations" ON public.reservations
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;