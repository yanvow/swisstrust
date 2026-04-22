-- ============================================================
-- Migration 022 — Document expiry email notifications
--
-- Sets up:
--   1. get_expiring_documents_today() — returns all documents
--      that expire on CURRENT_DATE (covers passport/ID, residence
--      permit, betreibungsauszug, salary slips, unemployment statements)
--   2. pg_cron job that calls the notify-expiring-documents edge
--      function every day at 08:00 UTC (09:00 CET / 10:00 CEST)
--
-- Prerequisites (run once as superuser after applying this migration):
--   ALTER DATABASE postgres SET app.settings.edge_function_base_url =
--     'https://zgcgosfddrihtwpzboiq.supabase.co/functions/v1';
--   ALTER DATABASE postgres SET app.settings.cron_secret = '<CRON_SECRET>';
--
-- The same CRON_SECRET must be set as a Supabase secret:
--   supabase secrets set CRON_SECRET=<same-value>
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ── Helper: documents expiring today ─────────────────────────────────────────
-- Returns one row per expiring document, including the computed expiry_date
-- and tenant contact info needed to send the email.
--
-- Expiry logic mirrors the client-side rules in tenant/documents.html:
--   • passport_id / guarantor_id        → ocr_extracted_data.expiry_date
--   • residence_permit                  → ocr_extracted_data.valid_until
--   • betreibungsauszug / guarantor_*   → certificate_date + 90 days (or created_at + 90 days)
--   • salary_slip_* / unemployment_*    → first of month 3 months after pay_period
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
        ) + INTERVAL '90 days'
      WHEN 'guarantor_betreibungsauszug'
        THEN COALESCE(
          (d.ocr_extracted_data->>'certificate_date')::date,
          d.created_at::date
        ) + INTERVAL '90 days'
      ELSE
        -- salary_slip_* / unemployment_* / guarantor_salary_slip_*
        to_date(d.ocr_extracted_data->>'pay_period', 'YYYY-MM') + INTERVAL '3 months'
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
      -- Betreibungsauszug — valid 90 days from certificate date
      (
        d.doc_type IN ('betreibungsauszug', 'guarantor_betreibungsauszug')
        AND COALESCE(
          (d.ocr_extracted_data->>'certificate_date')::date,
          d.created_at::date
        ) + INTERVAL '90 days' = CURRENT_DATE
      )
      OR
      -- Salary slips & unemployment statements — valid for 3 calendar months
      -- after the pay period month (expire on the 1st of the 4th month)
      (
        d.doc_type IN (
          'salary_slip_1', 'salary_slip_2', 'salary_slip_3',
          'guarantor_salary_slip_1', 'guarantor_salary_slip_2', 'guarantor_salary_slip_3',
          'unemployment_benefit_1', 'unemployment_benefit_2', 'unemployment_benefit_3'
        )
        AND (d.ocr_extracted_data->>'pay_period') IS NOT NULL
        AND to_date(d.ocr_extracted_data->>'pay_period', 'YYYY-MM') + INTERVAL '3 months' = CURRENT_DATE
      )
    );
$$;

-- Only the service role (edge functions) should call this directly.
-- No anon/authenticated grant — the edge function uses the service role.
REVOKE ALL ON FUNCTION public.get_expiring_documents_today() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_expiring_documents_today() TO service_role;

-- ── Cron trigger function ─────────────────────────────────────────────────────
-- Called by pg_cron. Reads config from database-level GUC variables so the
-- secret is never hard-coded in the migration file.
CREATE OR REPLACE FUNCTION public.trigger_expiry_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _base_url    text := current_setting('app.settings.edge_function_base_url', true);
  _cron_secret text := current_setting('app.settings.cron_secret', true);
BEGIN
  IF _base_url IS NULL OR _cron_secret IS NULL THEN
    RAISE WARNING '[trigger_expiry_notifications] app.settings not configured — skipping';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := _base_url || '/notify-expiring-documents',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || _cron_secret
    ),
    body    := '{}'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.trigger_expiry_notifications() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trigger_expiry_notifications() TO postgres;

-- ── pg_cron schedule: 08:00 UTC = 09:00 CET ──────────────────────────────────
-- Remove any previous version of this job before (re-)creating it.
SELECT cron.unschedule('notify-expiring-documents')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'notify-expiring-documents'
);

SELECT cron.schedule(
  'notify-expiring-documents',
  '0 8 * * *',
  'SELECT public.trigger_expiry_notifications();'
);
