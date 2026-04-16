-- Migration 009 — Security hardening
-- Fixes: rls_references_user_metadata (8 tables), function_search_path_mutable,
--        auth_users_exposed (anon revoked), rls_policy_always_true (3 policies)

-- ============================================================
-- Fix 1: Migrate admin role from user_metadata to app_metadata
-- user_metadata is user-editable; app_metadata is service-role only.
-- Any user could previously self-grant admin by calling
-- supabase.auth.updateUser({ data: { role: 'admin' } }).
-- ============================================================
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
WHERE raw_user_meta_data->>'role' = 'admin';

-- ============================================================
-- Fix 2: Revoke anon access from user_emails view
-- ============================================================
REVOKE SELECT ON public.user_emails FROM anon;

-- ============================================================
-- Fix 3: Fix handle_new_user — set immutable search_path
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  CASE NEW.raw_user_meta_data->>'role'
    WHEN 'tenant' THEN
      INSERT INTO public.tenants (user_id, full_name)
      VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
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
      NULL;
  END CASE;
  RETURN NEW;
END;
$$;

-- ============================================================
-- Fix 4: Rebuild all *_admin_all RLS policies using app_metadata
-- ============================================================

DROP POLICY IF EXISTS tenants_admin_all ON public.tenants;
CREATE POLICY tenants_admin_all ON public.tenants
  FOR ALL TO authenticated
  USING  (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin');

DROP POLICY IF EXISTS agencies_admin_all ON public.agencies;
CREATE POLICY agencies_admin_all ON public.agencies
  FOR ALL TO authenticated
  USING  (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin');

DROP POLICY IF EXISTS agents_admin_all ON public.agency_agents;
CREATE POLICY agents_admin_all ON public.agency_agents
  FOR ALL TO authenticated
  USING  (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin');

DROP POLICY IF EXISTS documents_admin_all ON public.documents;
CREATE POLICY documents_admin_all ON public.documents
  FOR ALL TO authenticated
  USING  (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin');

DROP POLICY IF EXISTS certificates_admin_all ON public.certificates;
CREATE POLICY certificates_admin_all ON public.certificates
  FOR ALL TO authenticated
  USING  (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin');

DROP POLICY IF EXISTS access_logs_admin_all ON public.document_access_logs;
CREATE POLICY access_logs_admin_all ON public.document_access_logs
  FOR ALL TO authenticated
  USING  (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin');

DROP POLICY IF EXISTS access_requests_admin_all ON public.access_requests;
CREATE POLICY access_requests_admin_all ON public.access_requests
  FOR ALL TO authenticated
  USING  (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin');

DROP POLICY IF EXISTS owners_admin_all ON public.owners;
CREATE POLICY owners_admin_all ON public.owners
  FOR ALL TO authenticated
  USING  (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin')
  WITH CHECK (((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin');

-- ============================================================
-- Fix 5: Tighten agents_accept_invite WITH CHECK
-- WITH CHECK (true) let any field be overwritten after match.
-- Now enforces: user_id must match the caller and status = active.
-- ============================================================
DROP POLICY IF EXISTS agents_accept_invite ON public.agency_agents;
CREATE POLICY agents_accept_invite ON public.agency_agents
  FOR UPDATE TO authenticated
  USING (invite_token = ((auth.jwt() -> 'user_metadata') ->> 'invite_token'))
  WITH CHECK (user_id = auth.uid() AND status = 'active');

-- ============================================================
-- Fix 6: Tighten certificates_agency_claim_ghost WITH CHECK
-- After update, agency_id must be set to the claiming agency.
-- ============================================================
DROP POLICY IF EXISTS certificates_agency_claim_ghost ON public.certificates;
CREATE POLICY certificates_agency_claim_ghost ON public.certificates
  FOR UPDATE TO authenticated
  USING (
    unregistered_agency_name IS NOT NULL AND
    agency_id IS NULL AND
    lower(unregistered_agency_name) = lower((
      SELECT agencies.company_name FROM public.agencies
      WHERE agencies.user_id = auth.uid() LIMIT 1
    ))
  )
  WITH CHECK (
    agency_id = (SELECT id FROM public.agencies WHERE user_id = auth.uid() LIMIT 1)
  );

-- ============================================================
-- Fix 7: Tighten access_logs_insert WITH CHECK
-- Public viewers must have null viewer_user_id;
-- authenticated viewers must set their own user_id.
-- ============================================================
DROP POLICY IF EXISTS access_logs_insert ON public.document_access_logs;
CREATE POLICY access_logs_insert ON public.document_access_logs
  FOR INSERT
  WITH CHECK (
    (viewer_type = 'public' AND viewer_user_id IS NULL) OR
    (auth.uid() IS NOT NULL AND viewer_user_id = auth.uid())
  );
