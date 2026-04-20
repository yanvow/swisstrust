// SwissTrust — OCR Edge Function
// Calls Claude Vision to extract structured data from tenant documents.
// Deploy: supabase functions deploy ocr
// Secret: supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-...

// @ts-nocheck — Deno runtime; standard TS language server does not resolve Deno/esm.sh globals.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ANTHROPIC_API_KEY       = Deno.env.get('ANTHROPIC_API_KEY')!
const SUPABASE_URL             = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Prompts per document type ────────────────────────────────────────────────

const PROMPTS: Record<string, string> = {
  passport_id: `You are reading a passport or national identity card.
Extract the following and return ONLY a valid JSON object:
{
  "full_name": "...",
  "date_of_birth": "YYYY-MM-DD",
  "nationality": "English adjective e.g. Swiss, French, German, Italian",
  "document_number": "...",
  "expiry_date": "YYYY-MM-DD",
  "document_type": "passport or id_card"
}
For nationality, always use the English adjective form (e.g. Swiss, French, German), not ISO codes.
Use null for any field you cannot clearly read. Return ONLY the JSON, no other text.`,

  residence_permit: `You are reading a Swiss residence permit (Aufenthaltsbewilligung / Permis de séjour / Permesso di soggiorno).
Extract and return ONLY a valid JSON object:
{
  "full_name": "...",
  "nationality": "English adjective e.g. French, German, Italian",
  "permit_type": "B or C or G or L",
  "valid_until": "YYYY-MM-DD",
  "canton": "..."
}
For nationality, always use the English adjective form (e.g. French, German, Italian), not ISO codes.
Use null for any field you cannot clearly read. Return ONLY the JSON, no other text.`,

  salary_slip_1: `You are reading a Swiss salary slip (fiche de salaire / Lohnabrechnung / busta paga).
Extract and return ONLY a valid JSON object:
{
  "employer_name": "...",
  "pay_period": "YYYY-MM",
  "gross_salary": 0000.00,
  "net_salary": 0000.00,
  "currency": "CHF"
}
Use null for any field you cannot clearly read. Return ONLY the JSON, no other text.`,

  salary_slip_2: `You are reading a Swiss salary slip (fiche de salaire / Lohnabrechnung / busta paga).
Extract and return ONLY a valid JSON object:
{
  "employer_name": "...",
  "pay_period": "YYYY-MM",
  "gross_salary": 0000.00,
  "net_salary": 0000.00,
  "currency": "CHF"
}
Use null for any field you cannot clearly read. Return ONLY the JSON, no other text.`,

  salary_slip_3: `You are reading a Swiss salary slip (fiche de salaire / Lohnabrechnung / busta paga).
Extract and return ONLY a valid JSON object:
{
  "employer_name": "...",
  "pay_period": "YYYY-MM",
  "gross_salary": 0000.00,
  "net_salary": 0000.00,
  "currency": "CHF"
}
Use null for any field you cannot clearly read. Return ONLY the JSON, no other text.`,

  betreibungsauszug: `You are reading a Swiss Betreibungsauszug (extrait du registre des poursuites / debt enforcement register extract).
Extract and return ONLY a valid JSON object:
{
  "is_clean": true,
  "issued_for": "...",
  "certificate_date": "YYYY-MM-DD",
  "issuing_office": "...",
  "pending_debt_count": 0
}
"is_clean" must be true only if the certificate explicitly shows NO pending debts or prosecutions.
Use null for any field you cannot clearly read. Return ONLY the JSON, no other text.`,

}

// Required fields for confidence scoring
const REQUIRED_FIELDS: Record<string, string[]> = {
  passport_id:       ['full_name', 'date_of_birth', 'document_number'],
  residence_permit:  ['full_name', 'nationality', 'permit_type', 'valid_until'],
  salary_slip_1:     ['employer_name', 'gross_salary', 'pay_period'],
  salary_slip_2:     ['employer_name', 'gross_salary', 'pay_period'],
  salary_slip_3:     ['employer_name', 'gross_salary', 'pay_period'],
  betreibungsauszug: ['is_clean', 'certificate_date'],
}

const DOC_LABELS: Record<string, string> = {
  passport_id:       'passport or ID card',
  residence_permit:  'residence permit',
  salary_slip_1:     'salary slip',
  salary_slip_2:     'salary slip',
  salary_slip_3:     'salary slip',
  betreibungsauszug: 'extract from the debt enforcement register',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

function computeConfidence(extracted: Record<string, unknown>, docType: string): number {
  const required     = REQUIRED_FIELDS[docType] || []
  const allValues    = Object.values(extracted)
  const nonNull      = allValues.filter(v => v != null && v !== '').length
  const requiredFilled = required.filter(k => {
    const v = extracted[k]
    return v != null && v !== ''
  }).length

  if (required.length === 0) return nonNull > 0 ? 0.75 : 0.3
  const reqScore     = requiredFilled / required.length
  const overallScore = allValues.length > 0 ? nonNull / allValues.length : 0
  return Math.round((reqScore * 0.8 + overallScore * 0.2) * 100) / 100
}

function confidenceToStatus(c: number): string {
  if (c >= 0.90) return 'auto_verified'
  if (c >= 0.65) return 'flagged'
  return 'rejected'
}

function rejectionReason(c: number, docType: string): string | null {
  if (c >= 0.65) return null
  return `We could not read enough information from your ${DOC_LABELS[docType] || 'document'}. ` +
    'Please ensure the document is clear, fully visible, and not blurry, then re-upload.'
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  console.log(`[OCR] Request received — method=${req.method}`)

  if (req.method === 'OPTIONS') {
    console.log('[OCR] CORS preflight — returning ok')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── 1. Authenticate the calling user ────────────────────────
    const authHeader = req.headers.get('Authorization') || ''
    const token      = authHeader.replace('Bearer ', '')
    if (!token) {
      console.error('[OCR] Missing Authorization header')
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const adminSb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: { user }, error: userErr } = await adminSb.auth.getUser(token)
    if (userErr || !user) {
      console.error('[OCR] Invalid token:', userErr?.message)
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const { documentId } = await req.json()
    if (!documentId) {
      console.error('[OCR] Missing documentId in request body')
      return new Response('Missing documentId', { status: 400, headers: corsHeaders })
    }

    console.log(`[OCR] Starting — documentId=${documentId} caller=${user.id}`)

    // Fetch document (joined to tenant to verify ownership)
    const { data: doc, error: docErr } = await adminSb
      .from('documents')
      .select('*, tenants!inner(user_id)')
      .eq('id', documentId)
      .single()

    if (docErr || !doc) {
      console.error('[OCR] Document not found:', docErr?.message)
      return new Response('Document not found', { status: 404, headers: corsHeaders })
    }

    // Only the tenant who owns the document (or an admin) may trigger OCR
    const callerRole = user.user_metadata?.role
    const ownerUserId = (doc as any).tenants?.user_id
    if (callerRole !== 'admin' && ownerUserId !== user.id) {
      console.error(`[OCR] Forbidden — caller=${user.id} owner=${ownerUserId}`)
      return new Response('Forbidden', { status: 403, headers: corsHeaders })
    }

    console.log(`[OCR] docType=${doc.doc_type} path=${doc.storage_path} mime=${doc.mime_type}`)

    // Mark as processing
    await adminSb.from('documents').update({ status: 'processing' }).eq('id', documentId)

    // Download file from private storage
    console.log('[OCR] Downloading file from storage…')
    const { data: fileBlob, error: dlErr } = await adminSb.storage
      .from('documents')
      .download(doc.storage_path)

    if (dlErr || !fileBlob) {
      console.error('[OCR] File download failed:', dlErr?.message)
      await adminSb.from('documents').update({
        status: 'rejected',
        rejection_reason: 'Could not retrieve the uploaded file. Please re-upload.',
      }).eq('id', documentId)
      return new Response(JSON.stringify({ error: 'File download failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const buffer   = await fileBlob.arrayBuffer()
    const b64      = uint8ArrayToBase64(new Uint8Array(buffer))
    const mimeType = doc.mime_type || 'image/jpeg'
    const isPdf    = mimeType === 'application/pdf' || doc.storage_path.toLowerCase().endsWith('.pdf')
    const fileSizeKb = Math.round(buffer.byteLength / 1024)

    console.log(`[OCR] File downloaded — ${fileSizeKb}kb isPdf=${isPdf}`)

    // Build Claude content block
    const fileBlock = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } }
      : { type: 'image',    source: { type: 'base64', media_type: mimeType === 'image/jpg' ? 'image/jpeg' : mimeType, data: b64 } }

    const prompt = PROMPTS[doc.doc_type] || PROMPTS['passport_id']

    // Call Claude
    console.log('[OCR] Calling Claude API…')
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [fileBlock, { type: 'text', text: prompt }],
        }],
      }),
    })

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text()
      console.error('[OCR] Anthropic API error:', anthropicRes.status, errText)
      await adminSb.from('documents').update({
        status: 'flagged',
        rejection_reason: 'OCR service temporarily unavailable. An admin will review this document manually.',
      }).eq('id', documentId)
      return new Response(JSON.stringify({ error: 'OCR failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const claudeData = await anthropicRes.json()
    const rawText    = claudeData.content?.[0]?.text || ''

    console.log('[OCR] Claude raw response:', rawText.slice(0, 300))

    // Parse JSON from Claude's reply
    let extracted: Record<string, unknown> = {}
    try {
      const match = rawText.match(/\{[\s\S]*\}/)
      if (match) extracted = JSON.parse(match[0])
    } catch (_) {
      console.error('[OCR] Failed to parse JSON from Claude response')
      extracted = { raw_text: rawText }
    }

    const confidence = computeConfidence(extracted, doc.doc_type)
    const status     = confidenceToStatus(confidence)
    const reason     = rejectionReason(confidence, doc.doc_type)

    console.log(`[OCR] Done — confidence=${confidence} status=${status}`)
    console.log('[OCR] Extracted:', JSON.stringify(extracted))

    const updatePayload: Record<string, unknown> = {
      status,
      ocr_extracted_data: extracted,
      confidence_score:   confidence,
      ocr_raw_text:       rawText,
    }
    if (reason) updatePayload.rejection_reason = reason

    await adminSb.from('documents').update(updatePayload).eq('id', documentId)

    console.log('[OCR] DB updated — all done')

    return new Response(JSON.stringify({ status, confidence, extracted }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('OCR function error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
