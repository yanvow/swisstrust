-- Migration 024 — Add co-tenant and roommate rental situation flags and profile fields

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS needs_co_tenant                    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS needs_roommate                     BOOLEAN DEFAULT FALSE,

  -- Co-tenant personal
  ADD COLUMN IF NOT EXISTS co_tenant_full_name                TEXT,
  ADD COLUMN IF NOT EXISTS co_tenant_gov_name                 TEXT,
  ADD COLUMN IF NOT EXISTS co_tenant_date_of_birth            DATE,
  ADD COLUMN IF NOT EXISTS co_tenant_nationality              TEXT,
  ADD COLUMN IF NOT EXISTS co_tenant_permit_type              permit_type,
  ADD COLUMN IF NOT EXISTS co_tenant_current_address          TEXT,
  -- Co-tenant income
  ADD COLUMN IF NOT EXISTS co_tenant_is_employee              BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS co_tenant_is_self_employed         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS co_tenant_employer_name            TEXT,
  ADD COLUMN IF NOT EXISTS co_tenant_job_role                 TEXT,
  ADD COLUMN IF NOT EXISTS co_tenant_employment_start_date    DATE,
  ADD COLUMN IF NOT EXISTS co_tenant_monthly_gross_salary     NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS co_tenant_business_name            TEXT,
  ADD COLUMN IF NOT EXISTS co_tenant_business_activity        TEXT,
  ADD COLUMN IF NOT EXISTS co_tenant_juridical_form           TEXT,
  ADD COLUMN IF NOT EXISTS co_tenant_business_start_date      DATE,
  ADD COLUMN IF NOT EXISTS co_tenant_annual_net_income        NUMERIC(12,2),

  -- Roommate personal
  ADD COLUMN IF NOT EXISTS roommate_full_name                 TEXT,
  ADD COLUMN IF NOT EXISTS roommate_gov_name                  TEXT,
  ADD COLUMN IF NOT EXISTS roommate_date_of_birth             DATE,
  ADD COLUMN IF NOT EXISTS roommate_nationality               TEXT,
  ADD COLUMN IF NOT EXISTS roommate_permit_type               permit_type,
  ADD COLUMN IF NOT EXISTS roommate_current_address           TEXT,
  -- Roommate income
  ADD COLUMN IF NOT EXISTS roommate_is_employee               BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS roommate_is_self_employed          BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS roommate_employer_name             TEXT,
  ADD COLUMN IF NOT EXISTS roommate_job_role                  TEXT,
  ADD COLUMN IF NOT EXISTS roommate_employment_start_date     DATE,
  ADD COLUMN IF NOT EXISTS roommate_monthly_gross_salary      NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS roommate_business_name             TEXT,
  ADD COLUMN IF NOT EXISTS roommate_business_activity         TEXT,
  ADD COLUMN IF NOT EXISTS roommate_juridical_form            TEXT,
  ADD COLUMN IF NOT EXISTS roommate_business_start_date       DATE,
  ADD COLUMN IF NOT EXISTS roommate_annual_net_income         NUMERIC(12,2);
