// SwissTrust — invite-agent Edge Function
// Creates an agency_agents record and sends a Supabase invite email.
// Deploy: supabase functions deploy invite-agent
// Secret:  supabase secrets set SITE_URL=https://your-domain.com

// @ts-nocheck — Deno runtime; standard TS language server does not resolve Deno/esm.sh globals.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL             = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE_URL                 = Deno.env.get('SITE_URL') || 'http://localhost'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log(`[invite-agent] Request received — method=${req.method}`)

  if (req.method === 'OPTIONS') {
    console.log('[invite-agent] CORS preflight — returning ok')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── 1. Authenticate the calling user ────────────────────────
    const authHeader = req.headers.get('Authorization') || ''
    const token      = authHeader.replace('Bearer ', '')
    if (!token) {
      console.error('[invite-agent] Missing Authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminSb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: { user }, error: userErr } = await adminSb.auth.getUser(token)
    if (userErr || !user) {
      console.error('[invite-agent] Invalid token:', userErr?.message)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const callerRole = user.user_metadata?.role
    console.log(`[invite-agent] Authenticated — caller=${user.id} role=${callerRole}`)

    if (callerRole !== 'agency' && callerRole !== 'admin') {
      console.error(`[invite-agent] Forbidden — role=${callerRole}`)
      return new Response(
        JSON.stringify({ error: 'Forbidden — only agency accounts or admins can invite agents' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 2. Validate input ────────────────────────────────────────
    const { agencyId, email } = await req.json()
    if (!agencyId || !email) {
      console.error('[invite-agent] Missing agencyId or email in request body')
      return new Response(
        JSON.stringify({ error: 'agencyId and email are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const normalEmail = email.toLowerCase().trim()
    console.log(`[invite-agent] Starting — agencyId=${agencyId} email=${normalEmail}`)

    // ── 3. Verify the agency exists (admins) or belongs to this user (agencies) ──
    let agencyQuery = adminSb.from('agencies').select('id, company_name').eq('id', agencyId)
    if (callerRole === 'agency') agencyQuery = agencyQuery.eq('user_id', user.id)
    const { data: agency, error: agencyErr } = await agencyQuery.single()
    if (agencyErr || !agency) {
      console.error('[invite-agent] Agency not found:', agencyErr?.message)
      return new Response(
        JSON.stringify({ error: 'Agency not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log(`[invite-agent] Agency verified — name="${agency.company_name}"`)

    // ── 4. Guard: no duplicate active / pending invite ───────────
    const { data: existing } = await adminSb
      .from('agency_agents')
      .select('id, status')
      .eq('agency_id', agencyId)
      .eq('email', normalEmail)
      .neq('status', 'removed')
      .maybeSingle()
    if (existing) {
      console.warn(`[invite-agent] Duplicate invite — existing id=${existing.id} status=${existing.status}`)
      return new Response(
        JSON.stringify({ error: 'An invite for this email already exists.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── 5. Create agency_agents record ───────────────────────────
    console.log('[invite-agent] Inserting agency_agents record…')
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
      console.error('[invite-agent] Insert failed:', insertErr?.message)
      return new Response(
        JSON.stringify({ error: insertErr?.message || 'Could not create invite record.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log(`[invite-agent] agency_agents record created — id=${agent.id} invite_token=${agent.invite_token}`)

    // ── 6. Send Supabase invite email ────────────────────────────
    // The invite email is sent by Supabase Auth. On click the user lands
    // at /auth/agent-accept.html with a valid session set in the URL hash.
    // user_metadata is embedded so agent-accept.html can link the session
    // to the agency_agents row via invite_token.
    const redirectTo = `${SITE_URL}/auth/agent-accept.html`
    console.log(`[invite-agent] Sending invite email — redirectTo=${redirectTo}`)
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
      console.error('[invite-agent] Auth invite failed:', inviteErr.message)
      // Roll back the agency_agents row so the admin can retry
      await adminSb.from('agency_agents').delete().eq('id', agent.id)
      console.log('[invite-agent] Rolled back agency_agents record')
      return new Response(
        JSON.stringify({ error: inviteErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[invite-agent] Done — agentId=${agent.id} invite sent to ${normalEmail}`)
    return new Response(
      JSON.stringify({ success: true, agentId: agent.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[invite-agent] Unhandled error:', err)
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
