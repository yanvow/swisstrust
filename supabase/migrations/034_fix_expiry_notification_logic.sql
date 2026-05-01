-- ============================================================
-- Migration 034 — Fix expiry notification logic to match client
--
-- Aligns get_expiring_documents_today() with the staleness rules
-- shown in tenant/documents.html so the email fires on the same
-- day the UI first flags a document as expired/stale.
--
-- Changes vs migration 022:
--   • Betreibungsauszug: was certificate_date + 90 days = today
--     (email fired on last valid day); now + 91 days (fires on
--     first stale day, matching client's daysSince(date) > 90).
--   • Salary slips / unemployment: was pay_period + 3 months = today
--     (email fired while client still showed doc as valid); now
--     + 4 months (fires on the 1st of the 4th month, matching
--     client's slipDate < first_of(current_month - 3)).
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_expiring_documents_today()
RETURNS TABLE (
  document_id  UUID,
  tenant_id    UUID,
  user_id      UUID,
  full_name    TEXT,
  doc_type     TEXT,
  expiry_date  DATE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    d.id                                  AS document_id,
    d.tenant_id,
    t.user_id,
    COALESCE(t.full_name, '')             AS full_name,
    d.doc_type::text                      AS doc_type,
    CASE d.doc_type
      WHEN 'passport_id'      THEN (d.ocr_extracted_data->>'expiry_date')::date
      WHEN 'guarantor_id'     THEN (d.ocr_extracted_data->>'expiry_date')::date
      WHEN 'residence_permit' THEN (d.ocr_extracted_data->>'valid_until')::date
      WHEN 'betreibungsauszug'
        THEN COALESCE(
          (d.ocr_extracted_data->>'certificate_date')::date,
          d.created_at::date
        ) + INTERVAL '91 days'
      WHEN 'guarantor_betreibungsauszug'
        THEN COALESCE(
          (d.ocr_extracted_data->>'certificate_date')::date,
          d.created_at::date
        ) + INTERVAL '91 days'
      ELSE
        -- salary_slip_* / unemployment_* / guarantor_salary_slip_*
        -- First stale day = 1st of the 4th month after pay_period
        to_date(d.ocr_extracted_data->>'pay_period', 'YYYY-MM') + INTERVAL '4 months'
    END::date                             AS expiry_date
  FROM public.documents d
  JOIN public.tenants   t ON t.id = d.tenant_id
  WHERE
    d.status != 'rejected'
    AND (
      -- Passport / national ID
      (
        d.doc_type IN ('passport_id', 'guarantor_id')
        AND (d.ocr_extracted_data->>'expiry_date') IS NOT NULL
        AND (d.ocr_extracted_data->>'expiry_date')::date = CURRENT_DATE
      )
      OR
      -- Residence permit
      (
        d.doc_type = 'residence_permit'
        AND (d.ocr_extracted_data->>'valid_until') IS NOT NULL
        AND (d.ocr_extracted_data->>'valid_until')::date = CURRENT_DATE
      )
      OR
      -- Betreibungsauszug — email on day 91, matching client's daysSince > 90
      (
        d.doc_type IN ('betreibungsauszug', 'guarantor_betreibungsauszug')
        AND COALESCE(
          (d.ocr_extracted_data->>'certificate_date')::date,
          d.created_at::date
        ) + INTERVAL '91 days' = CURRENT_DATE
      )
      OR
      -- Salary slips & unemployment — email on 1st of 4th month after pay period,
      -- matching client's slipDate < first_of(current_month - 3)
      (
        d.doc_type IN (
          'salary_slip_1', 'salary_slip_2', 'salary_slip_3',
          'guarantor_salary_slip_1', 'guarantor_salary_slip_2', 'guarantor_salary_slip_3',
          'unemployment_benefit_1', 'unemployment_benefit_2', 'unemployment_benefit_3'
        )
        AND (d.ocr_extracted_data->>'pay_period') IS NOT NULL
        AND to_date(d.ocr_extracted_data->>'pay_period', 'YYYY-MM') + INTERVAL '4 months' = CURRENT_DATE
      )
    );
$$;
