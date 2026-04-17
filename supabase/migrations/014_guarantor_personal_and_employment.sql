-- Migration 014: add guarantor personal information and employment columns

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS guarantor_full_name            TEXT,
  ADD COLUMN IF NOT EXISTS guarantor_date_of_birth        DATE,
  ADD COLUMN IF NOT EXISTS guarantor_nationality          TEXT,
  ADD COLUMN IF NOT EXISTS guarantor_permit_type          permit_type,
  ADD COLUMN IF NOT EXISTS guarantor_current_address      TEXT,
  ADD COLUMN IF NOT EXISTS guarantor_employer_name        TEXT,
  ADD COLUMN IF NOT EXISTS guarantor_job_role             TEXT,
  ADD COLUMN IF NOT EXISTS guarantor_employment_start_date DATE,
  ADD COLUMN IF NOT EXISTS guarantor_monthly_gross_salary  NUMERIC(12,2);
