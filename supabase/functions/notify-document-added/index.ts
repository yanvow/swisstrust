// SwissTrust — notify-document-added Edge Function
// Sends a confirmation email to a tenant when they upload a document.
// Triggered by a Postgres INSERT trigger on the documents table (via pg_net).

// @ts-nocheck — Deno runtime; standard TS language server does not resolve Deno/esm.sh globals.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const CRON_SECRET               = Deno.env.get('CRON_SECRET')!
const RESEND_API_KEY            = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL                = Deno.env.get('FROM_EMAIL') || 'notifications@swisstrust.ch'
const SITE_URL                  = Deno.env.get('SITE_URL') || 'https://app.swisstrust.ch'

const DOC_LABELS: Record<string, string> = {
  passport_id:                 'Passport / ID Card',
  residence_permit:            'Residence Permit',
  betreibungsauszug:           'Betreibungsauszug (Debt Enforcement Extract)',
  salary_slip_1:               'Salary Slip (month 1)',
  salary_slip_2:               'Salary Slip (month 2)',
  salary_slip_3:               'Salary Slip (month 3)',
  balance_sheet:               'Balance Sheet',
  tax_assessment:              'Tax Assessment',
  bank_statement:              'Bank Statement',
  net_income_proof:            'Net Income Proof',
  turnover_proof:              'Turnover Proof',
  avs_affiliation:             'AVS Affiliation Certificate',
  commercial_register:         'Commercial Register Extract',
  guarantor_id:                "Guarantor's Passport / ID Card",
  guarantor_salary_slip_1:     "Guarantor's Salary Slip (month 1)",
  guarantor_salary_slip_2:     "Guarantor's Salary Slip (month 2)",
  guarantor_salary_slip_3:     "Guarantor's Salary Slip (month 3)",
  guarantor_betreibungsauszug: "Guarantor's Betreibungsauszug",
  unemployment_benefit_1:      'Unemployment Benefit Statement (month 1)',
  unemployment_benefit_2:      'Unemployment Benefit Statement (month 2)',
  unemployment_benefit_3:      'Unemployment Benefit Statement (month 3)',
  welfare_rent_coverage:       'Welfare / Rent Coverage Letter',
}

function docLabel(docType: string): string {
  return DOC_LABELS[docType] ?? docType.replace(/_/g, ' ')
}

function buildEmailHtml(firstName: string, fileName: string, docType: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Document received — SwissTrust</title>
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
            <td style="padding:32px 32px 24px;">
              <p style="margin:0 0 8px;font-size:15px;color:#1a1a1a;">Hi ${firstName || 'there'},</p>
              <p style="margin:0 0 24px;font-size:15px;color:#444444;line-height:1.6;">
                We've successfully received your document and it is now being processed.
              </p>

              <!-- Document card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;border:1px solid #e8e8e8;border-radius:6px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:#888;">Document type</p>
                    <p style="margin:0 0 16px;font-size:15px;color:#1a1a1a;font-weight:600;">${docLabel(docType)}</p>
                    <p style="margin:0 0 4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:#888;">File name</p>
                    <p style="margin:0;font-size:14px;color:#444444;word-break:break-all;">${fileName}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 32px 32px;">
              <p style="margin:0 0 16px;font-size:14px;color:#666666;line-height:1.6;">
                You can track the status of your documents at any time from your profile.
              </p>
              <a href="${SITE_URL}/tenant/documents.html"
                 style="display:inline-block;background:#1a2e4a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:6px;">
                View my documents
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

function buildEmailText(firstName: string, fileName: string, docType: string): string {
  return [
    `Hi ${firstName || 'there'},`,
    '',
    `We've successfully received your document and it is now being processed.`,
    '',
    `Document type: ${docLabel(docType)}`,
    `File name:     ${fileName}`,
    '',
    `Track your documents: ${SITE_URL}/tenant/documents.html`,
    '',
    '— SwissTrust',
  ].join('\n')
}

Deno.serve(async (req) => {
  console.log(`[notify-document-added] ${req.method} received`)

  const authHeader = req.headers.get('Authorization') || ''
  const providedSecret = authHeader.replace('Bearer ', '').trim()
  if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
    console.error('[notify-document-added] Unauthorized')
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { tenant_id, file_name, doc_type } = await req.json()

    if (!tenant_id || !file_name || !doc_type) {
      return new Response(JSON.stringify({ error: 'Missing tenant_id, file_name or doc_type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const adminSb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get tenant's user_id and name
    const { data: tenant, error: tenantErr } = await adminSb
      .from('tenants')
      .select('user_id, full_name')
      .eq('id', tenant_id)
      .single()

    if (tenantErr || !tenant) {
      console.error('[notify-document-added] Tenant not found:', tenantErr?.message)
      return new Response(JSON.stringify({ error: 'Tenant not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get email from auth.users
    const { data: { user }, error: userErr } = await adminSb.auth.admin.getUserById(tenant.user_id)

    if (userErr || !user?.email) {
      console.error('[notify-document-added] Could not get user email:', userErr?.message)
      return new Response(JSON.stringify({ error: 'User email not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const firstName = (tenant.full_name ?? '').split(' ')[0] || ''

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from:    FROM_EMAIL,
        to:      [user.email],
        subject: `Document received — ${file_name}`,
        html:    buildEmailHtml(firstName, file_name, doc_type),
        text:    buildEmailText(firstName, file_name, doc_type),
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Resend error ${res.status}: ${body}`)
    }

    console.log(`[notify-document-added] Email sent — tenant=${tenant_id} to=${user.email} file=${file_name}`)
    return new Response(JSON.stringify({ sent: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[notify-document-added] Unhandled error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
