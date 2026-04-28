// SwissTrust — notify-new-agency Edge Function
// Sends a verification-request email to all admin users when a new agency registers.
// Triggered by a Postgres AFTER INSERT trigger on the agencies table (via pg_net).

// @ts-nocheck — Deno runtime; standard TS language server does not resolve Deno/esm.sh globals.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET               = Deno.env.get('CRON_SECRET')!
const RESEND_API_KEY            = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL                = Deno.env.get('FROM_EMAIL') || 'notifications@swisstrust.ch'
const SITE_URL                  = Deno.env.get('SITE_URL') || 'https://app.swisstrust.ch'

function buildEmailHtml(agency: { company_name: string; address: string; contact_email: string; id: string }): string {
  const adminUrl = `${SITE_URL}/admin/agencies.html`
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>New agency registered — SwissTrust</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1a2e4a;padding:28px 32px;">
              <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-.3px;">SwissTrust</span>
              <span style="color:rgba(255,255,255,.6);font-size:13px;margin-left:12px;">Admin notification</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              <p style="margin:0 0 8px;font-size:15px;color:#1a1a1a;font-weight:600;">New agency registration — verification required</p>
              <p style="margin:0 0 24px;font-size:15px;color:#444444;line-height:1.6;">
                A new agency has just registered on SwissTrust and is pending verification. Please review their details and verify or reject the account.
              </p>

              <!-- Agency card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;border:1px solid #e8e8e8;border-radius:6px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:#888;">Agency name</p>
                    <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;font-weight:600;">${agency.company_name}</p>
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:#888;">Business address</p>
                    <p style="margin:0 0 16px;font-size:14px;color:#444444;">${agency.address || '—'}</p>
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:#888;">Contact email</p>
                    <p style="margin:0;font-size:14px;color:#444444;">${agency.contact_email || '—'}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 32px 32px;">
              <p style="margin:0 0 16px;font-size:14px;color:#666666;line-height:1.6;">
                Until verified, the agency appears in the directory but is marked as unverified. Tenants can still direct certificates to them.
              </p>
              <a href="${adminUrl}"
                 style="display:inline-block;background:#1a2e4a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:6px;">
                Review in admin panel
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#aaa;line-height:1.6;">
                This is an automated admin notification from SwissTrust.<br>
                &copy; ${new Date().getFullYear()} SwissTrust
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildEmailText(agency: { company_name: string; address: string; contact_email: string }): string {
  return [
    'New agency registration — verification required',
    '',
    `Agency name:    ${agency.company_name}`,
    `Address:        ${agency.address || '—'}`,
    `Contact email:  ${agency.contact_email || '—'}`,
    '',
    'Please review and verify or reject the account in the admin panel.',
    '',
    '— SwissTrust (automated notification)',
  ].join('\n')
}

Deno.serve(async (req) => {
  console.log(`[notify-new-agency] ${req.method} received`)

  const authHeader = req.headers.get('Authorization') || ''
  const providedSecret = authHeader.replace('Bearer ', '').trim()
  if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
    console.error('[notify-new-agency] Unauthorized')
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { agency_id } = await req.json()
    if (!agency_id) {
      return new Response(JSON.stringify({ error: 'Missing agency_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const adminSb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: agency, error: agencyErr } = await adminSb
      .from('agencies')
      .select('id, company_name, address, contact_email')
      .eq('id', agency_id)
      .single()

    if (agencyErr || !agency) {
      console.error('[notify-new-agency] Agency not found:', agencyErr?.message)
      return new Response(JSON.stringify({ error: 'Agency not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Fetch all admin users to notify
    const { data: { users: allUsers }, error: usersErr } = await adminSb.auth.admin.listUsers({ perPage: 1000 })
    if (usersErr) {
      console.error('[notify-new-agency] Could not list users:', usersErr.message)
      return new Response(JSON.stringify({ error: 'Could not list users' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const adminEmails = (allUsers || [])
      .filter(u => u.user_metadata?.role === 'admin' && u.email)
      .map(u => u.email as string)

    if (adminEmails.length === 0) {
      console.warn('[notify-new-agency] No admin users found — skipping email')
      return new Response(JSON.stringify({ sent: false, reason: 'no_admins' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from:    FROM_EMAIL,
        to:      adminEmails,
        subject: `[Checks] New agency registered — ${agency.company_name}`,
        html:    buildEmailHtml(agency),
        text:    buildEmailText(agency),
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Resend error ${res.status}: ${body}`)
    }

    console.log(`[notify-new-agency] Email sent — agency=${agency_id} to=${adminEmails.join(', ')}`)
    return new Response(JSON.stringify({ sent: true, recipients: adminEmails.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[notify-new-agency] Unhandled error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
