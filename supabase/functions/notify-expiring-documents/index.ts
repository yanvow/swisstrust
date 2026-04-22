// SwissTrust — notify-expiring-documents Edge Function
// Queries all documents expiring today and sends one grouped email per tenant.
// Triggered daily at 09:00 CET via pg_cron (see migration 022).
//
// Required secrets (supabase secrets set …):
//   CRON_SECRET      — shared secret that pg_cron sends as Bearer token
//   RESEND_API_KEY   — Resend API key for sending email
//   FROM_EMAIL       — sender address (e.g. notifications@swisstrust.ch)
//   SITE_URL         — public base URL (e.g. https://app.swisstrust.ch)

// @ts-nocheck — Deno runtime; standard TS language server does not resolve Deno/esm.sh globals.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL             = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET              = Deno.env.get('CRON_SECRET')!
const RESEND_API_KEY           = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL               = Deno.env.get('FROM_EMAIL') || 'notifications@swisstrust.ch'
const SITE_URL                 = Deno.env.get('SITE_URL') || 'https://app.swisstrust.ch'

// ── Document type labels ──────────────────────────────────────────────────────

const DOC_LABELS: Record<string, string> = {
  passport_id:                  'Passport / ID Card',
  residence_permit:             'Residence Permit',
  betreibungsauszug:            'Betreibungsauszug (Debt Enforcement Extract)',
  salary_slip_1:                'Salary Slip (month 1)',
  salary_slip_2:                'Salary Slip (month 2)',
  salary_slip_3:                'Salary Slip (month 3)',
  guarantor_id:                 "Guarantor's Passport / ID Card",
  guarantor_salary_slip_1:      "Guarantor's Salary Slip (month 1)",
  guarantor_salary_slip_2:      "Guarantor's Salary Slip (month 2)",
  guarantor_salary_slip_3:      "Guarantor's Salary Slip (month 3)",
  guarantor_betreibungsauszug:  "Guarantor's Betreibungsauszug",
  unemployment_benefit_1:       'Unemployment Benefit Statement (month 1)',
  unemployment_benefit_2:       'Unemployment Benefit Statement (month 2)',
  unemployment_benefit_3:       'Unemployment Benefit Statement (month 3)',
}

function docLabel(docType: string): string {
  return DOC_LABELS[docType] ?? docType.replace(/_/g, ' ')
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ── Email HTML ────────────────────────────────────────────────────────────────

interface ExpiringDoc {
  document_id: string
  doc_type: string
  expiry_date: string
}

function buildEmailHtml(firstName: string, docs: ExpiringDoc[]): string {
  const rows = docs.map(d => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;color:#1a1a1a;font-size:14px;">
        ${docLabel(d.doc_type)}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;color:#d44a2a;font-size:14px;font-weight:600;white-space:nowrap;">
        ${formatDate(d.expiry_date)}
      </td>
    </tr>`).join('')

  const docWord = docs.length === 1 ? 'document has' : 'documents have'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Document Expiry Notice — SwissTrust</title>
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
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 8px;">
              <p style="margin:0 0 8px;font-size:15px;color:#1a1a1a;">Hi ${firstName || 'there'},</p>
              <p style="margin:0 0 24px;font-size:15px;color:#444444;line-height:1.6;">
                The following ${docWord} expired today. Please upload a renewed version
                to keep your SwissTrust profile up to date.
              </p>

              <!-- Document table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e8e8;border-radius:6px;overflow:hidden;">
                <thead>
                  <tr style="background:#f8f8f8;">
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Document</th>
                    <th style="padding:10px 12px;text-align:left;font-size:12px;color:#888;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Expired on</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:24px 32px 32px;">
              <a href="${SITE_URL}/tenant/documents.html"
                 style="display:inline-block;background:#1a2e4a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:6px;">
                Update my documents
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#aaa;line-height:1.6;">
                This is an automated notification from SwissTrust. Please do not reply to this email.<br>
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

function buildEmailText(firstName: string, docs: ExpiringDoc[]): string {
  const lines = docs.map(d => `  • ${docLabel(d.doc_type)} — expired ${formatDate(d.expiry_date)}`)
  return [
    `Hi ${firstName || 'there'},`,
    '',
    'The following document(s) expired today:',
    ...lines,
    '',
    `Please log in to update them: ${SITE_URL}/tenant/documents.html`,
    '',
    '— SwissTrust',
  ].join('\n')
}

// ── Send via Resend ───────────────────────────────────────────────────────────

async function sendEmail(to: string, firstName: string, docs: ExpiringDoc[]): Promise<void> {
  const docWord = docs.length === 1 ? 'document' : 'documents'
  const subject = `Action required: ${docs.length} ${docWord} expired today`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from:     FROM_EMAIL,
      to:       [to],
      subject,
      html:     buildEmailHtml(firstName, docs),
      text:     buildEmailText(firstName, docs),
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Resend error ${res.status}: ${body}`)
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  console.log(`[notify-expiring-documents] ${req.method} received`)

  // Only pg_cron (and manual test calls) should reach this function.
  // Validate the shared secret sent as a Bearer token.
  const authHeader = req.headers.get('Authorization') || ''
  const providedSecret = authHeader.replace('Bearer ', '').trim()
  if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
    console.error('[notify-expiring-documents] Unauthorized — bad or missing CRON_SECRET')
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const adminSb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // ── 1. Fetch documents expiring today ──────────────────────────────────
    const { data: expiringDocs, error: queryErr } = await adminSb
      .rpc('get_expiring_documents_today')

    if (queryErr) {
      console.error('[notify-expiring-documents] Query error:', queryErr.message)
      return new Response(JSON.stringify({ error: queryErr.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!expiringDocs || expiringDocs.length === 0) {
      console.log('[notify-expiring-documents] No expiring documents today')
      return new Response(JSON.stringify({ notified: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log(`[notify-expiring-documents] Found ${expiringDocs.length} expiring document(s)`)

    // ── 2. Group by tenant ─────────────────────────────────────────────────
    const byTenant = new Map<string, { userId: string; fullName: string; docs: ExpiringDoc[] }>()

    for (const row of expiringDocs) {
      if (!byTenant.has(row.tenant_id)) {
        byTenant.set(row.tenant_id, {
          userId:   row.user_id,
          fullName: row.full_name ?? '',
          docs:     [],
        })
      }
      byTenant.get(row.tenant_id)!.docs.push({
        document_id: row.document_id,
        doc_type:    row.doc_type,
        expiry_date: row.expiry_date,
      })
    }

    // ── 3. Send one email per tenant ───────────────────────────────────────
    let notified = 0
    let failed   = 0

    for (const [tenantId, { userId, fullName, docs }] of byTenant) {
      // Retrieve the tenant's email from auth.users
      const { data: { user }, error: userErr } = await adminSb.auth.admin.getUserById(userId)

      if (userErr || !user?.email) {
        console.warn(`[notify-expiring-documents] Could not get email for tenant=${tenantId} user=${userId}:`, userErr?.message)
        failed++
        continue
      }

      const firstName = fullName.split(' ')[0] || ''

      try {
        await sendEmail(user.email, firstName, docs)
        console.log(`[notify-expiring-documents] Email sent — tenant=${tenantId} to=${user.email} docs=${docs.length}`)
        notified++
      } catch (emailErr) {
        console.error(`[notify-expiring-documents] Email failed — tenant=${tenantId}:`, String(emailErr))
        failed++
      }
    }

    return new Response(JSON.stringify({ notified, failed }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[notify-expiring-documents] Unhandled error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
