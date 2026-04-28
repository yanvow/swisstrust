-- ============================================================
-- Migration 033 — Email notification on new agency registration
--
-- Adds a Postgres AFTER INSERT trigger on agencies that calls
-- the notify-new-agency edge function via pg_net.
-- All admin users receive an email asking them to verify the agency.
-- Only fires for self-registered agencies (user_id IS NOT NULL).
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_new_agency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _base_url    text;
  _cron_secret text;
BEGIN
  -- Skip seed/admin-created rows (no auth account attached)
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT value INTO _base_url    FROM public._cron_config WHERE key = 'edge_function_base_url';
  SELECT value INTO _cron_secret FROM public._cron_config WHERE key = 'cron_secret';

  IF _base_url IS NULL OR _cron_secret IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := _base_url || '/notify-new-agency',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || _cron_secret
    ),
    body    := jsonb_build_object(
      'agency_id', NEW.id
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_agency_inserted ON public.agencies;
CREATE TRIGGER on_agency_inserted
  AFTER INSERT ON public.agencies
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_agency();
