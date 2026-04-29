// SwissTrust — invite-agent Edge Function
// Supports two modes:
//   mode: 'invite' (default) — send Supabase invite email, agent sets own password
//   mode: 'create'           — create agent directly with given credentials
// Deploy: supabase functions deploy invite-agent

// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE_URL                  = Deno.env.get('SITE_URL') || 'http://localhost'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // ── 1. Authenticate calling user ─────────────────────────
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    if (!token) return json({ error: 'Unauthorized' }, 401)

    const adminSb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: { user }, error: userErr } = await adminSb.auth.getUser(token)
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

    const callerRole = user.user_metadata?.role
    if (callerRole !== 'agency' && callerRole !== 'admin') {
      return json({ error: 'Forbidden — only agency accounts or admins can manage agents' }, 403)
    }

    // ── 2. Parse + validate input ────────────────────────────
    const body = await req.json()
    const { agencyId, email, mode = 'invite', firstName, lastName, password } = body

    if (!agencyId || !email) return json({ error: 'agencyId and email are required' }, 400)
    if (mode === 'create' && !password) return json({ error: 'password is required for create mode' }, 400)

    const normalEmail = email.toLowerCase().trim()

    // ── 3. Verify agency ─────────────────────────────────────
    let agencyQuery = adminSb.from('agencies').select('id, company_name').eq('id', agencyId)
    if (callerRole === 'agency') agencyQuery = agencyQuery.eq('user_id', user.id)
    const { data: agency, error: agencyErr } = await agencyQuery.single()
    if (agencyErr || !agency) return json({ error: 'Agency not found' }, 404)

    // ── 4. Guard: no duplicate active / pending ──────────────
    const { data: existing } = await adminSb
      .from('agency_agents')
      .select('id, status')
      .eq('agency_id', agencyId)
      .eq('email', normalEmail)
      .neq('status', 'removed')
      .maybeSingle()
    if (existing) return json({ error: 'An agent with this email already exists.' }, 409)

    // ── 5a. CREATE mode — direct credentials ─────────────────
    if (mode === 'create') {
      const { data: createData, error: createErr } = await adminSb.auth.admin.createUser({
        email: normalEmail,
        password,
        email_confirm: true,
        user_metadata: {
          role:                 'agent',
          agency_id:            agencyId,
          agency_name:          agency.company_name,
          must_change_password: true,
        },
      })

      if (createErr || !createData?.user) {
        console.error('[invite-agent] createUser failed:', createErr?.message)
        return json({ error: createErr?.message || 'Could not create user.' }, 500)
      }

      const newUser = createData.user
      const { data: agent, error: insertErr } = await adminSb
        .from('agency_agents')
        .insert({
          agency_id:   agencyId,
          user_id:     newUser.id,
          email:       normalEmail,
          first_name:  firstName || null,
          last_name:   lastName  || null,
          status:      'active',
          accepted_at: new Date().toISOString(),
          invited_by:  user.id,
        })
        .select()
        .single()

      if (insertErr) {
        await adminSb.auth.admin.deleteUser(newUser.id)
        return json({ error: insertErr.message || 'Could not create agent record.' }, 500)
      }

      console.log(`[invite-agent] Agent created — id=${agent.id} userId=${newUser.id}`)
      return json({ success: true, agentId: agent.id })
    }

    // ── 5b. INVITE mode — send email ─────────────────────────
    const { data: agent, error: insertErr } = await adminSb
      .from('agency_agents')
      .insert({ agency_id: agencyId, email: normalEmail, invited_by: user.id })
      .select()
      .single()

    if (insertErr || !agent) {
      return json({ error: insertErr?.message || 'Could not create invite record.' }, 500)
    }

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
      await adminSb.from('agency_agents').delete().eq('id', agent.id)
      return json({ error: inviteErr.message }, 500)
    }

    console.log(`[invite-agent] Invite sent — agentId=${agent.id} email=${normalEmail}`)
    return json({ success: true, agentId: agent.id })

  } catch (err) {
    console.error('[invite-agent] Unhandled error:', err)
    return json({ error: String(err) }, 500)
  }
})
