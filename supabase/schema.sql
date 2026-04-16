-- ============================================================
-- SwissTrust — Supabase Database Schema
-- Run this in the Supabase SQL editor (dashboard → SQL Editor)
-- ============================================================

-- Enums (drop first so the script is safe to re-run)
DROP TYPE IF EXISTS heard_about_property CASCADE;
DROP TYPE IF EXISTS certificate_mode     CASCADE;
DROP TYPE IF EXISTS trust_score_grade    CASCADE;
DROP TYPE IF EXISTS document_status      CASCADE;
DROP TYPE IF EXISTS document_type        CASCADE;
DROP TYPE IF EXISTS permit_type          CASCADE;

CREATE TYPE permit_type AS ENUM ('swiss', 'B', 'C', 'G', 'L');
CREATE TYPE document_type AS ENUM (
  -- Identity (all tenants)
  'passport_id',
  'residence_permit',
  'betreibungsauszug',
  'reference_letter',
  -- Employee income
  'salary_slip_1',
  'salary_slip_2',
  'salary_slip_3',
  -- Self-employed income: proof of income
  'balance_sheet',
  'tax_assessment',
  'bank_statement',
  'net_income_proof',
  'turnover_proof',
  -- Self-employed income: proof of status
  'avs_affiliation',
  'commercial_register',
  -- Guarantor
  'guarantor_id',
  'guarantor_salary_slip_1',
  'guarantor_salary_slip_2',
  'guarantor_salary_slip_3',
  'guarantor_betreibungsauszug',
  -- Unemployed
  'unemployment_benefit_1',
  'unemployment_benefit_2',
  'unemployment_benefit_3',
  -- Welfare / social assistance
  'welfare_rent_coverage'
);
CREATE TYPE document_status AS ENUM (
  'pending',
  'processing',
  'auto_verified',
  'flagged',
  'rejected'
);
CREATE TYPE trust_score_grade AS ENUM ('A', 'B', 'C');
CREATE TYPE certificate_mode AS ENUM ('directed', 'open', 'on_request');
CREATE TYPE heard_about_property AS ENUM (
  'former_tenant',
  'relocation_agency',
  'website',
  'immobilier_ch',
  'other'
);

-- ============================================================
-- TABLE: agencies (before certificates — FK dependency)
-- ============================================================
CREATE TABLE IF NOT EXISTS agencies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name  TEXT NOT NULL,
  address       TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  is_verified   BOOLEAN DEFAULT FALSE,
  is_suspended  BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

-- Anyone can read agencies (for tenant dropdown)
DROP POLICY IF EXISTS "agencies_public_read" ON agencies;
CREATE POLICY "agencies_public_read" ON agencies
  FOR SELECT USING (true);

-- Agency can update their own row
DROP POLICY IF EXISTS "agencies_own_update" ON agencies;
CREATE POLICY "agencies_own_update" ON agencies
  FOR UPDATE USING (auth.uid() = user_id);

-- Only authenticated user can insert their own agency
DROP POLICY IF EXISTS "agencies_own_insert" ON agencies;
CREATE POLICY "agencies_own_insert" ON agencies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TABLE: agency_agents
-- ============================================================
CREATE TABLE IF NOT EXISTS agency_agents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id    UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email        TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'active', 'suspended', 'removed')),
  invited_by   UUID REFERENCES auth.users(id),
  invite_token UUID NOT NULL DEFAULT gen_random_uuid(),
  invited_at   TIMESTAMPTZ DEFAULT NOW(),
  accepted_at  TIMESTAMPTZ,
  first_name   TEXT,
  last_name    TEXT,
  phone        TEXT,
  UNIQUE(agency_id, email)
);

ALTER TABLE agency_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agents_admin_all" ON agency_agents;
CREATE POLICY "agents_admin_all" ON agency_agents FOR ALL
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "agents_agency_select" ON agency_agents;
CREATE POLICY "agents_agency_select" ON agency_agents FOR SELECT
  USING (agency_id IN (SELECT id FROM agencies WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "agents_own_select" ON agency_agents;
CREATE POLICY "agents_own_select" ON agency_agents FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "agents_accept_invite" ON agency_agents;
CREATE POLICY "agents_accept_invite" ON agency_agents FOR UPDATE
  USING (
    invite_token::text = (auth.jwt() -> 'user_metadata' ->> 'invite_token')
  )
  WITH CHECK (true);

-- ============================================================
-- TABLE: tenants
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Personal
  full_name             TEXT,
  date_of_birth         DATE,
  nationality           TEXT,
  current_address       TEXT,

  -- Residency
  permit_type           permit_type,

  -- Employment
  employer_name         TEXT,
  job_role              TEXT,
  employment_start_date DATE,
  monthly_gross_salary  NUMERIC(10, 2),

  -- Household
  occupant_count        INTEGER DEFAULT 1,
  is_smoker             BOOLEAN DEFAULT FALSE,
  has_pets              BOOLEAN DEFAULT FALSE,

  -- Rental situation
  needs_guarantor                  BOOLEAN DEFAULT FALSE,
  is_employee                      BOOLEAN DEFAULT FALSE,
  is_self_employed                 BOOLEAN DEFAULT FALSE,
  is_unemployed                    BOOLEAN DEFAULT FALSE,
  is_on_welfare                    BOOLEAN DEFAULT FALSE,
  has_household_liability_insurance BOOLEAN DEFAULT FALSE,
  rental_deposit_type              TEXT,   -- 'bank_guarantee' | 'cash_deposit' | 'insurance_guarantee' | 'cooperative_share' | 'other'

  -- Status
  profile_complete      BOOLEAN DEFAULT FALSE,
  is_suspended          BOOLEAN DEFAULT FALSE,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenants_own_select" ON tenants;
CREATE POLICY "tenants_own_select" ON tenants
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "tenants_own_insert" ON tenants;
CREATE POLICY "tenants_own_insert" ON tenants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tenants_own_update" ON tenants;
CREATE POLICY "tenants_own_update" ON tenants
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- TABLE: documents
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  doc_type            document_type NOT NULL,

  -- Storage
  storage_path        TEXT NOT NULL,
  file_name           TEXT,
  mime_type           TEXT,

  -- OCR results
  ocr_raw_text        TEXT,
  ocr_extracted_data  JSONB,
  confidence_score    NUMERIC(4, 3),  -- 0.000 to 1.000

  -- Status
  status              document_status DEFAULT 'pending',
  rejection_reason    TEXT,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),

  -- One active document per type per tenant
  UNIQUE(tenant_id, doc_type)
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_own_select" ON documents;
CREATE POLICY "documents_own_select" ON documents
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "documents_own_insert" ON documents;
CREATE POLICY "documents_own_insert" ON documents
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "documents_own_update" ON documents;
CREATE POLICY "documents_own_update" ON documents
  FOR UPDATE USING (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

-- ============================================================
-- TABLE: certificates
-- ============================================================
CREATE TABLE IF NOT EXISTS certificates (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agency_id         UUID NOT NULL REFERENCES agencies(id),

  -- Property fields
  property_address  TEXT NOT NULL,
  property_city     TEXT,
  property_postcode TEXT,
  rooms             NUMERIC(3, 1),
  floor             TEXT,
  move_in_date      DATE,
  rent_chf          NUMERIC(10, 2),
  charges_chf       NUMERIC(10, 2),
  total_chf         NUMERIC(10, 2),
  parking_desired   BOOLEAN DEFAULT FALSE,
  has_visited       BOOLEAN DEFAULT FALSE,
  heard_about       heard_about_property,

  -- Trust & verification (computed at generation time — immutable)
  trust_score       trust_score_grade,
  is_eligible       BOOLEAN,

  -- Certificate identity
  cert_code         TEXT UNIQUE NOT NULL,  -- STD-XXXX-XXXX
  qr_data_url       TEXT,                  -- base64 PNG (small, stored in DB)
  qr_url            TEXT,                  -- full URL encoded in QR

  -- Certificate sharing mode (from strategy: Directed / Open / On-Request)
  mode              certificate_mode DEFAULT 'directed',
  -- For directed mode: either agency_id OR owner_email is set
  owner_email       TEXT,            -- directed to private landlord by email
  -- For on_request mode: null = pending, 'approved' = approved, 'denied' = denied
  approval_status   TEXT CHECK (approval_status IN ('pending', 'approved', 'denied')),

  -- Lifecycle
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Tenant sees their own certificates
DROP POLICY IF EXISTS "certificates_own_tenant_select" ON certificates;
CREATE POLICY "certificates_own_tenant_select" ON certificates
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "certificates_own_tenant_insert" ON certificates;
CREATE POLICY "certificates_own_tenant_insert" ON certificates
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

-- Agency sees certificates directed to them
DROP POLICY IF EXISTS "certificates_own_agency_select" ON certificates;
CREATE POLICY "certificates_own_agency_select" ON certificates
  FOR SELECT USING (
    agency_id IN (SELECT id FROM agencies WHERE user_id = auth.uid())
  );

-- Public read by cert_code (app layer enforces tiered content)
DROP POLICY IF EXISTS "certificates_public_read" ON certificates;
CREATE POLICY "certificates_public_read" ON certificates
  FOR SELECT USING (is_active = TRUE);

-- Agency can read documents for certificates directed to them
-- (defined here, after certificates table exists)
DROP POLICY IF EXISTS "documents_agency_select" ON documents;
CREATE POLICY "documents_agency_select" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM certificates c
      JOIN agencies a ON a.id = c.agency_id
      WHERE c.tenant_id = documents.tenant_id
        AND a.user_id = auth.uid()
    )
  );

-- ============================================================
-- TABLE: document_access_logs (compliance / audit trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS document_access_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id   UUID NOT NULL REFERENCES certificates(id),
  viewer_user_id   UUID REFERENCES auth.users(id),
  viewer_type      TEXT NOT NULL CHECK (viewer_type IN ('public', 'agency', 'tenant')),
  ip_address       TEXT,
  accessed_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE document_access_logs ENABLE ROW LEVEL SECURITY;

-- Tenant reads access logs for their certificates
DROP POLICY IF EXISTS "access_logs_tenant_select" ON document_access_logs;
CREATE POLICY "access_logs_tenant_select" ON document_access_logs
  FOR SELECT USING (
    certificate_id IN (
      SELECT c.id FROM certificates c
      JOIN tenants t ON t.id = c.tenant_id
      WHERE t.user_id = auth.uid()
    )
  );

-- Any user (incl. anon server-side) can insert a log
DROP POLICY IF EXISTS "access_logs_insert" ON document_access_logs;
CREATE POLICY "access_logs_insert" ON document_access_logs
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- TABLE: owners (private landlords)
-- ============================================================
CREATE TABLE IF NOT EXISTS owners (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name        TEXT NOT NULL,
  phone            TEXT,
  property_address TEXT,
  is_suspended     BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE owners ENABLE ROW LEVEL SECURITY;

-- Anyone can read owners (tenants can see requester name/details)
DROP POLICY IF EXISTS "owners_public_read" ON owners;
CREATE POLICY "owners_public_read" ON owners
  FOR SELECT USING (true);

-- Owner can insert their own row
DROP POLICY IF EXISTS "owners_own_insert" ON owners;
CREATE POLICY "owners_own_insert" ON owners
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Owner can update their own row
DROP POLICY IF EXISTS "owners_own_update" ON owners;
CREATE POLICY "owners_own_update" ON owners
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- TABLE: access_requests (for On-Request certificate mode)
-- ============================================================
CREATE TABLE IF NOT EXISTS access_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id    UUID NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  requester_user_id UUID NOT NULL REFERENCES auth.users(id),
  requester_type    TEXT NOT NULL CHECK (requester_type IN ('agency', 'owner')),
  requester_name    TEXT,           -- company name or full name at request time
  message           TEXT,           -- optional message from requester
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'denied')),
  requested_at      TIMESTAMPTZ DEFAULT NOW(),
  responded_at      TIMESTAMPTZ,
  UNIQUE(certificate_id, requester_user_id)
);

ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- Requester can insert their own request
DROP POLICY IF EXISTS "access_requests_insert" ON access_requests;
CREATE POLICY "access_requests_insert" ON access_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_user_id);

-- Requester can read their own requests
DROP POLICY IF EXISTS "access_requests_requester_select" ON access_requests;
CREATE POLICY "access_requests_requester_select" ON access_requests
  FOR SELECT USING (auth.uid() = requester_user_id);

-- Tenant reads requests for their certificates
DROP POLICY IF EXISTS "access_requests_tenant_select" ON access_requests;
CREATE POLICY "access_requests_tenant_select" ON access_requests
  FOR SELECT USING (
    certificate_id IN (
      SELECT c.id FROM certificates c
      JOIN tenants t ON t.id = c.tenant_id
      WHERE t.user_id = auth.uid()
    )
  );

-- Tenant can update status (approve / deny) on their certificates
DROP POLICY IF EXISTS "access_requests_tenant_update" ON access_requests;
CREATE POLICY "access_requests_tenant_update" ON access_requests
  FOR UPDATE USING (
    certificate_id IN (
      SELECT c.id FROM certificates c
      JOIN tenants t ON t.id = c.tenant_id
      WHERE t.user_id = auth.uid()
    )
  );

-- ============================================================
-- TRIGGER: auto-create profile row on sign-up
-- Fires after every INSERT into auth.users.
-- Reads raw_user_meta_data.role to decide which table.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.raw_user_meta_data->>'role'

    WHEN 'tenant' THEN
      INSERT INTO public.tenants (user_id, full_name)
      VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name'
      );

    WHEN 'agency' THEN
      INSERT INTO public.agencies (user_id, company_name, address, contact_email)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'address', ''),
        COALESCE(NEW.raw_user_meta_data->>'contact_email', NEW.email)
      );

    WHEN 'owner' THEN
      INSERT INTO public.owners (user_id, full_name, property_address)
      VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.raw_user_meta_data->>'property_address'
      );

    ELSE
      NULL; -- unknown role, do nothing

  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- MIGRATION: make agency_id nullable
-- Required for Open and On-Request certificate modes.
-- Run this if you already ran the original schema.
-- ============================================================
ALTER TABLE certificates ALTER COLUMN agency_id DROP NOT NULL;

-- ============================================================
-- MIGRATION: add owner_email column to certificates
-- Required for Directed-to-private-landlord mode.
-- Run this if you already ran the original schema.
-- ============================================================
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS owner_email TEXT;

-- ============================================================
-- MIGRATION: ghost delivery tracking
-- Allows tenants to direct certs to agencies not yet on SwissTrust.
-- Run this if you already ran the original schema.
-- ============================================================
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS unregistered_agency_name TEXT;

-- Agencies can SELECT ghost certs where their company name matches
DROP POLICY IF EXISTS "certificates_ghost_agency_select" ON certificates;
CREATE POLICY "certificates_ghost_agency_select" ON certificates
  FOR SELECT USING (
    is_active = TRUE
    AND unregistered_agency_name IS NOT NULL
    AND LOWER(unregistered_agency_name) = LOWER(
      (SELECT company_name FROM agencies WHERE user_id = auth.uid() LIMIT 1)
    )
  );

-- Agencies can claim (UPDATE agency_id) ghost certs directed to their name
DROP POLICY IF EXISTS "certificates_agency_claim_ghost" ON certificates;
CREATE POLICY "certificates_agency_claim_ghost" ON certificates
  FOR UPDATE USING (
    unregistered_agency_name IS NOT NULL
    AND agency_id IS NULL
    AND LOWER(unregistered_agency_name) = LOWER(
      (SELECT company_name FROM agencies WHERE user_id = auth.uid() LIMIT 1)
    )
  ) WITH CHECK (true);

-- ============================================================
-- ADMIN RLS POLICIES
-- Admin users have role='admin' in user_metadata (set via Supabase dashboard).
-- To create an admin: Supabase dashboard → Authentication → Users → edit user
--   → set raw_user_meta_data to {"role":"admin"}
-- ============================================================

DROP POLICY IF EXISTS "tenants_admin_all" ON tenants;
CREATE POLICY "tenants_admin_all" ON tenants FOR ALL
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "agencies_admin_all" ON agencies;
CREATE POLICY "agencies_admin_all" ON agencies FOR ALL
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "documents_admin_all" ON documents;
CREATE POLICY "documents_admin_all" ON documents FOR ALL
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "certificates_admin_all" ON certificates;
CREATE POLICY "certificates_admin_all" ON certificates FOR ALL
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "access_logs_admin_all" ON document_access_logs;
CREATE POLICY "access_logs_admin_all" ON document_access_logs FOR ALL
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "access_requests_admin_all" ON access_requests;
CREATE POLICY "access_requests_admin_all" ON access_requests FOR ALL
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "owners_admin_all" ON owners;
CREATE POLICY "owners_admin_all" ON owners FOR ALL
  USING  ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

-- ============================================================
-- VIEW: user_emails
-- Exposes auth user emails to authenticated users (e.g. admin).
-- The view owner (postgres) has access to the auth schema.
-- ============================================================
CREATE OR REPLACE VIEW public.user_emails AS
  SELECT id, email FROM auth.users;

GRANT SELECT ON public.user_emails TO authenticated;

-- ============================================================
-- Storage buckets
-- Create these in Supabase dashboard → Storage:
--   1. "documents"  — Private bucket
--   2. "qr-codes"   — Public bucket
-- ============================================================
