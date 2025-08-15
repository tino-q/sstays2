-- ====================================================================
-- Supabase migration: reservations + admin RLS (fresh database)
-- - No status constraint on "status"
-- - Single FOR ALL RLS policy for admins
-- - updated_at trigger, helpful indexes
-- - anon role has NO schema usage => cannot even see the table name
-- ====================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_min_messages = warning;

-- =========================================================
-- 1) reservations table
-- =========================================================
CREATE TABLE public.reservations (
  id TEXT PRIMARY KEY,                         -- Airbnb reservation ID (e.g., "HM4SNC5CAP")
  listing_id TEXT REFERENCES public.listings(id),
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
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT reservations_party_size_check CHECK (party_size IS NULL OR party_size >= 0),
  CONSTRAINT reservations_nights_check     CHECK (nights     IS NULL OR nights     >= 0),
  CONSTRAINT reservations_dates_check      CHECK (
    check_in IS NULL OR check_out IS NULL OR check_out >= check_in
  )
);

COMMENT ON TABLE public.reservations IS 'Airbnb reservation records parsed from Mailgun webhooks or internal ingestion.';
COMMENT ON COLUMN public.reservations.listing_id IS 'Foreign key to listings table (nickname).';
COMMENT ON COLUMN public.reservations.status IS 'Reservation status (default: confirmed).';
COMMENT ON COLUMN public.reservations.thread_id IS 'Conversation/thread id if known.';
COMMENT ON COLUMN public.reservations.ai_notes IS 'Free-form operational notes produced by internal AI tools.';

-- =========================================================
-- 3) Indexes
-- =========================================================
CREATE INDEX idx_reservations_check_in
  ON public.reservations (check_in);
CREATE INDEX idx_reservations_listing_id
  ON public.reservations (listing_id);
CREATE INDEX idx_reservations_created_at
  ON public.reservations (created_at);
CREATE INDEX idx_reservations_listing_checkin
  ON public.reservations (listing_id, check_in);

-- =========================================================
-- 4) updated_at trigger
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reservations_set_updated_at
BEFORE UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 5) Row Level Security (RLS)
-- =========================================================
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin users to manage reservations"
  ON public.reservations
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =========================================================
-- 6) Grants
-- =========================================================

-- Remove anon privileges on schema and table to match security expectations
REVOKE USAGE ON SCHEMA public FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.reservations FROM anon;

-- Allow authenticated users to reference the schema (subject to RLS)
GRANT USAGE ON SCHEMA public TO authenticated, service_role;

-- Allow authenticated users to attempt SELECT (RLS will filter rows)
GRANT SELECT ON public.reservations TO authenticated;

-- service_role bypasses RLS and has full access internally

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO service_role;
