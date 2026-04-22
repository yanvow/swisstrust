-- ============================================================
-- Migration 023 — Email notification on document upload
--
-- Adds a Postgres AFTER INSERT trigger on documents that calls
-- the notify-document-added edge function via pg_net.
-- The tenant receives an email confirming their upload with the file name.
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_document_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _base_url    text;
  _cron_secret text;
BEGIN
  SELECT value INTO _base_url    FROM public._cron_config WHERE key = 'edge_function_base_url';
  SELECT value INTO _cron_secret FROM public._cron_config WHERE key = 'cron_secret';

  IF _base_url IS NULL OR _cron_secret IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := _base_url || '/notify-document-added',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || _cron_secret
    ),
    body    := jsonb_build_object(
      'tenant_id', NEW.tenant_id,
      'file_name', COALESCE(NEW.file_name, 'Unknown file'),
      'doc_type',  NEW.doc_type
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_document_inserted
  AFTER INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_document_added();
