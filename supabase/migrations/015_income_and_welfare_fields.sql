-- Migration 015: tenant income-type sections and guarantor self-employment fields

ALTER TABLE tenants
  -- Tenant self-employment
  ADD COLUMN IF NOT EXISTS business_name                    TEXT,
  ADD COLUMN IF NOT EXISTS business_activity                TEXT,
  ADD COLUMN IF NOT EXISTS business_start_date              DATE,
  ADD COLUMN IF NOT EXISTS annual_net_income                NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS juridical_form                   TEXT,
  -- Tenant previous employment (unemployed)
  ADD COLUMN IF NOT EXISTS previous_employer_name           TEXT,
  ADD COLUMN IF NOT EXISTS previous_job_role                TEXT,
  ADD COLUMN IF NOT EXISTS previous_employment_end_date     DATE,
  ADD COLUMN IF NOT EXISTS unemployment_benefit_amount      NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS unemployment_benefit_start_date  DATE,
  -- Tenant welfare
  ADD COLUMN IF NOT EXISTS welfare_organisation             TEXT,
  -- Guarantor self-employment
  ADD COLUMN IF NOT EXISTS guarantor_business_name          TEXT,
  ADD COLUMN IF NOT EXISTS guarantor_business_activity      TEXT,
  ADD COLUMN IF NOT EXISTS guarantor_business_start_date    DATE,
  ADD COLUMN IF NOT EXISTS guarantor_annual_net_income      NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS guarantor_juridical_form         TEXT;
