-- ============================================================
-- Migration 004 — Rental situation fields & new document types
-- Run in Supabase SQL Editor for existing databases.
-- ============================================================

-- ── 1. Add new document_type enum values ─────────────────────
-- (ALTER TYPE … ADD VALUE is safe; existing rows are untouched)

ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'balance_sheet';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'tax_assessment';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'bank_statement';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'net_income_proof';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'turnover_proof';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'avs_affiliation';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'commercial_register';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'guarantor_id';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'guarantor_salary_slip_1';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'guarantor_salary_slip_2';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'guarantor_salary_slip_3';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'guarantor_betreibungsauszug';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'unemployment_benefit_1';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'unemployment_benefit_2';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'unemployment_benefit_3';
ALTER TYPE document_type ADD VALUE IF NOT EXISTS 'welfare_rent_coverage';

-- ── 2. Add new columns to tenants table ──────────────────────

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS needs_guarantor                   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_employee                       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_self_employed                  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_unemployed                     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_on_welfare                     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_household_liability_insurance BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rental_deposit_type               TEXT;
