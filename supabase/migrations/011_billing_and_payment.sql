-- ============================================================
-- Migration 011 — Billing profiles, payment methods, invoices
-- Run in Supabase SQL Editor for existing databases.
-- ============================================================

-- ── 1. Billing profiles (one per user) ───────────────────────
CREATE TABLE IF NOT EXISTS billing_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name         TEXT,
  email             TEXT,
  address           TEXT,
  phone_country_code TEXT DEFAULT '+41',
  phone_number      TEXT,
  tax_ids           TEXT[] DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE billing_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_own_all" ON billing_profiles
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "billing_admin_all" ON billing_profiles
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ── 2. Payment methods (multiple per user) ───────────────────
CREATE TABLE IF NOT EXISTS payment_methods (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  method_type      TEXT NOT NULL CHECK (method_type IN ('wire_transfer', 'credit_card', 'twint')),
  is_default       BOOLEAN DEFAULT false,
  -- Wire transfer
  bank_name        TEXT,
  iban             TEXT,
  bic              TEXT,
  account_holder   TEXT,
  -- Credit card (store only safe display metadata, never full card number)
  card_brand       TEXT CHECK (card_brand IN ('visa', 'mastercard')),
  card_last4       TEXT,
  card_expiry      TEXT,  -- MM/YY
  cardholder_name  TEXT,
  -- TWINT
  twint_phone      TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_own_all" ON payment_methods
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "payment_admin_all" ON payment_methods
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ── 3. Invoices (admin-created, user-readable) ───────────────
CREATE TABLE IF NOT EXISTS invoices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  amount_chf     NUMERIC(10,2) NOT NULL,
  description    TEXT,
  status         TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'overdue')),
  issued_at      TIMESTAMPTZ DEFAULT now(),
  due_at         TIMESTAMPTZ,
  paid_at        TIMESTAMPTZ
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Users can only read their own invoices
CREATE POLICY "invoices_own_select" ON invoices FOR SELECT
  USING (user_id = auth.uid());

-- Admins have full access
CREATE POLICY "invoices_admin_all" ON invoices
  USING ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ── 4. Reload schema cache ────────────────────────────────────
NOTIFY pgrst, 'reload schema';
