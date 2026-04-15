// Checks — invite-agent Edge Function
// Creates an agency_agents record and sends a Supabase invite email.
// Deploy: supabase functions deploy invite-agent
// Secret:  supabase secrets set SITE_URL=https://your-domain.com

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL             = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE_URL                 = Deno.env.get('SITE_URL') || 'http://localhost'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // ── 1. Authenticate the calling user ────────────────────────
    const authHeader = req.headers.get('Authorization') || ''
    const token      = authHeader.replace('Bearer ', '')
    if (!token) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const adminSb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: { user }, error: userErr } = await adminSb.auth.getUser(token)
    if (userErr || !user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    if (user.user_metadata?.role !== 'agency') {
      return new Response('Forbidden — only the main agency account can invite agents', { status: 403, headers: corsHeaders })
    }

    // ── 2. Validate input ────────────────────────────────────────
    const { agencyId, email } = await req.json()
    if (!agencyId || !email) {
      return new Response(
        JSON.stringify({ error: 'agencyId and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const normalEmail = email.toLowerCase().trim()

    // ── 3. Verify the agency belongs to this user ────────────────
    const { data: agency, error: agencyErr } = await adminSb
      .from('agencies')
      .select('id, company_name')
      .eq('id', agencyId)
      .eq('user_id', user.id)
      .single()
    if (agencyErr || !agency) {
      return new Response('Agency not found', { status: 404, headers: corsHeaders })
    }

    // ── 4. Guard: no duplicate active / pending invite ───────────
    const { data: existing } = await adminSb
      .from('agency_agents')
      .select('id, status')
      .eq('agency_id', agencyId)
      .eq('email', normalEmail)
      .neq('status', 'removed')
      .maybeSingle()
    if (existing) {
      return new Response(
        JSON.stringify({ error: 'An invite for this email already exists.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 5. Create agency_agents record ───────────────────────────
    const { data: agent, error: insertErr } = await adminSb
      .from('agency_agents')
      .insert({
        agency_id:  agencyId,
        email:      normalEmail,
        invited_by: user.id,
      })
      .select()
      .single()
    if (insertErr || !agent) {
      return new Response(
        JSON.stringify({ error: insertErr?.message || 'Could not create invite record.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 6. Send Supabase invite email ────────────────────────────
    // The invite email is sent by Supabase Auth. On click the user lands
    // at /auth/agent-accept.html with a valid session set in the URL hash.
    // user_metadata is embedded so agent-accept.html can link the session
    // to the agency_agents row via invite_token.
    const redirectTo = `${SITE_URL}/auth/agent-accept.html`
    const { error: inviteErr } = await adminSb.auth.admin.inviteUserByEmail(normalEmail, {
      data: {
        role:         'agent',
        agency_id:    agencyId,
        invite_token: agent.invite_token,
        agency_name:  agency.company_name,
      },
      redirectTo,
    })

    if (inviteErr) {
      // Roll back the agency_agents row so the admin can retry
      await adminSb.from('agency_agents').delete().eq('id', agent.id)
      return new Response(
        JSON.stringify({ error: inviteErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, agentId: agent.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[invite-agent]', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
