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
  'passport_id',
  'residence_permit',
  'salary_slip_1',
  'salary_slip_2',
  'salary_slip_3',
  'betreibungsauszug',
  'reference_letter'
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
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;

-- Anyone can read agencies (for tenant dropdown)
CREATE POLICY "agencies_public_read" ON agencies
  FOR SELECT USING (true);

-- Agency can update their own row
CREATE POLICY "agencies_own_update" ON agencies
  FOR UPDATE USING (auth.uid() = user_id);

-- Only authenticated user can insert their own agency
CREATE POLICY "agencies_own_insert" ON agencies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

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

  -- Status
  profile_complete      BOOLEAN DEFAULT FALSE,

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenants_own_select" ON tenants
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "tenants_own_insert" ON tenants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

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

CREATE POLICY "documents_own_select" ON documents
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

CREATE POLICY "documents_own_insert" ON documents
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

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
  -- For on_request mode: null = pending, 'approved' = approved, 'denied' = denied
  approval_status   TEXT CHECK (approval_status IN ('pending', 'approved', 'denied')),

  -- Lifecycle
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Tenant sees their own certificates
CREATE POLICY "certificates_own_tenant_select" ON certificates
  FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

CREATE POLICY "certificates_own_tenant_insert" ON certificates
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
  );

-- Agency sees certificates directed to them
CREATE POLICY "certificates_own_agency_select" ON certificates
  FOR SELECT USING (
    agency_id IN (SELECT id FROM agencies WHERE user_id = auth.uid())
  );

-- Public read by cert_code (app layer enforces tiered content)
CREATE POLICY "certificates_public_read" ON certificates
  FOR SELECT USING (is_active = TRUE);

-- Agency can read documents for certificates directed to them
-- (defined here, after certificates table exists)
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
CREATE POLICY "access_logs_tenant_select" ON document_access_logs
  FOR SELECT USING (
    certificate_id IN (
      SELECT c.id FROM certificates c
      JOIN tenants t ON t.id = c.tenant_id
      WHERE t.user_id = auth.uid()
    )
  );

-- Any user (incl. anon server-side) can insert a log
CREATE POLICY "access_logs_insert" ON document_access_logs
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- Storage buckets
-- Create these in Supabase dashboard → Storage:
--   1. "documents"  — Private bucket
--   2. "qr-codes"   — Public bucket
-- ============================================================
