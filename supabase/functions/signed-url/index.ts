// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'No authorization header' }, 401)

    const { storage_path } = await req.json()
    if (!storage_path) return json({ error: 'Missing storage_path' }, 400)

    // Identify the caller
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return json({ error: 'Unauthorized' }, 401)

    const tenantId = storage_path.split('/')[0]
    const role     = user.user_metadata?.role
    const svc      = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    let hasAccess = false

    if (role === 'admin') {
      hasAccess = true

    } else if (role === 'tenant') {
      const { data } = await svc
        .from('tenants').select('id').eq('user_id', user.id).eq('id', tenantId).maybeSingle()
      hasAccess = !!data

    } else if (role === 'agency') {
      const { data: agencyRow } = await svc
        .from('agencies')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (agencyRow) {
        const { data: directedCert } = await svc
          .from('certificates')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('agency_id', agencyRow.id)
          .maybeSingle()
        if (directedCert) {
          hasAccess = true
        } else {
          // on_request with approved access — fetch cert IDs first, then check requests
          const { data: tenantCerts } = await svc
            .from('certificates')
            .select('id')
            .eq('tenant_id', tenantId)
            .eq('mode', 'on_request')
          if (tenantCerts && tenantCerts.length > 0) {
            const { data: approved } = await svc
              .from('access_requests')
              .select('id')
              .eq('requester_user_id', user.id)
              .eq('status', 'approved')
              .in('certificate_id', tenantCerts.map((c: any) => c.id))
              .maybeSingle()
            hasAccess = !!approved
          }
        }
      }

    } else if (role === 'owner') {
      const { data } = await svc
        .from('certificates')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('owner_email', user.email)
        .eq('mode', 'directed')
        .maybeSingle()
      hasAccess = !!data
    }

    if (!hasAccess) return json({ error: 'Access denied' }, 403)

    const { data, error } = await svc.storage.from('documents').createSignedUrl(storage_path, 60)
    if (error || !data?.signedUrl) return json({ error: 'Could not generate URL' }, 500)

    return json({ url: data.signedUrl })
  } catch (err) {
    return json({ error: 'Internal error' }, 500)
  }
})

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
