// ============================================================
// SwissTrust — Shared Supabase client + auth helpers
// Include AFTER the Supabase CDN script tag.
// ============================================================

const SUPABASE_URL     = 'https://zgcgosfddrihtwpzboiq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnY2dvc2ZkZHJpaHR3cHpib2lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5OTQ1OTksImV4cCI6MjA5MTU3MDU5OX0.xOnxEdebUSBtUNZzjJn_H50U9bbWfwF3lo3boDGHons';

// Browser singleton
const _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window._sb = _sb;

// ── Auth helpers ──────────────────────────────────────────

async function getSession() {
  const { data: { session } } = await _sb.auth.getSession();
  return session;
}

async function getUser() {
  const { data: { user } } = await _sb.auth.getUser();
  return user;
}

// Redirect to login if not authenticated or wrong role.
// role: 'tenant' | 'agency' | 'owner' | null (any authenticated user)
async function requireAuth(role) {
  const session = await getSession();
  if (!session) {
    window.location.href = rootPath() + 'auth/login.html';
    return null;
  }
  if (role && session.user.user_metadata?.role !== role) {
    window.location.href = rootPath() + 'auth/login.html';
    return null;
  }
  return session.user;
}

async function signOut() {
  await _sb.auth.signOut();
  window.location.href = rootPath() + 'auth/login.html';
}

// Return relative path from current page to project root.
// Works for pages at root, /auth/, /tenant/, /agency/, /cert/
function rootPath() {
  const depth = window.location.pathname.split('/').filter(Boolean).length;
  // In file:// URLs depth counts the filename too, so subtract 1
  const levels = Math.max(depth - 1, 0);
  return levels === 0 ? '' : '../'.repeat(levels);
}

// ── DB helpers ────────────────────────────────────────────

async function getTenantByUserId(userId) {
  const { data, error } = await _sb
    .from('tenants')
    .select('*')
    .eq('user_id', userId)
    .single();
  return { data, error };
}

async function upsertTenant(userId, fields) {
  const { data, error } = await _sb
    .from('tenants')
    .upsert({ user_id: userId, ...fields }, { onConflict: 'user_id' })
    .select()
    .single();
  return { data, error };
}

async function getAgencies() {
  const { data, error } = await _sb
    .from('agencies')
    .select('id, company_name, address')
    .order('company_name');
  return { data, error };
}

async function getCertificatesByTenant(tenantId) {
  const { data, error } = await _sb
    .from('certificates')
    .select('*, agencies(company_name)')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  return { data, error };
}

async function getCertificatesByAgency(agencyId) {
  const { data, error } = await _sb
    .from('certificates')
    .select('*, tenants(full_name, monthly_gross_salary, occupant_count, is_smoker, has_pets)')
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  return { data, error };
}

async function getCertificateByCode(certCode) {
  const { data, error } = await _sb
    .from('certificates')
    .select('*, agencies(id, company_name, user_id), tenants(full_name, monthly_gross_salary, employer_name, job_role, employment_start_date, occupant_count, is_smoker, has_pets)')
    .eq('cert_code', certCode)
    .eq('is_active', true)
    .single();
  return { data, error };
}

async function getDocumentsByTenant(tenantId) {
  const { data, error } = await _sb
    .from('documents')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at');
  return { data, error };
}

async function logAccess(certificateId, viewerUserId, viewerType) {
  await _sb.from('document_access_logs').insert({
    certificate_id: certificateId,
    viewer_user_id: viewerUserId || null,
    viewer_type: viewerType,
    ip_address: null,
  });
}

// ── Access requests (On-Request mode) ────────────────────

async function getAccessRequestStatus(certificateId, requesterUserId) {
  const { data, error } = await _sb
    .from('access_requests')
    .select('id, status, requested_at, responded_at')
    .eq('certificate_id', certificateId)
    .eq('requester_user_id', requesterUserId)
    .maybeSingle();
  return { data, error };
}

async function createAccessRequest(certificateId, requesterUserId, requesterType, requesterName, message) {
  const { data, error } = await _sb
    .from('access_requests')
    .insert({
      certificate_id: certificateId,
      requester_user_id: requesterUserId,
      requester_type: requesterType,
      requester_name: requesterName,
      message: message || null,
    })
    .select()
    .single();
  return { data, error };
}

async function getPendingRequestsForTenant(tenantId) {
  const { data, error } = await _sb
    .from('access_requests')
    .select(`
      id, status, requester_type, requester_name, message, requested_at,
      certificates(id, cert_code, property_address, property_city, mode)
    `)
    .eq('status', 'pending')
    .order('requested_at', { ascending: false });
  return { data, error };
}

async function respondToAccessRequest(requestId, status) {
  const { data, error } = await _sb
    .from('access_requests')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', requestId)
    .select()
    .single();
  return { data, error };
}

// ── Certificate code generator ────────────────────────────
// STD-XXXX-XXXX using unambiguous alphabet (no 0/O, 1/I/l)

function generateCertCode() {
  const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rand = (n) => Array.from({ length: n }, () => alpha[Math.floor(Math.random() * alpha.length)]).join('');
  return `STD-${rand(4)}-${rand(4)}`;
}

// ── UI helpers ────────────────────────────────────────────

function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.style.display = 'block';
}

function hideError(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.style.display = 'none';
}

function setLoading(btn, loading, defaultText) {
  btn.disabled = loading;
  btn.textContent = loading ? (window.stI18n?.t('Please wait…') || 'Please wait…') : defaultText;
}

// Expose everything
window.sbHelpers = {
  getSession, getUser, requireAuth, signOut, rootPath,
  getTenantByUserId, upsertTenant, getAgencies,
  getCertificatesByTenant, getCertificatesByAgency,
  getCertificateByCode, getDocumentsByTenant, logAccess,
  getAccessRequestStatus, createAccessRequest,
  getPendingRequestsForTenant, respondToAccessRequest,
  generateCertCode, showError, hideError, setLoading,
};
