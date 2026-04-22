# swisstrust

## Document Expiry Notifications

Documents that expire are emailed to tenants at 09:00 CET on the day they expire. Multiple documents expiring the same day are grouped into a single email.

### What triggers an expiry notification?

| Document type | Expires when |
| --- | --- |
| Passport / ID card | `ocr_extracted_data.expiry_date` = today |
| Residence permit | `ocr_extracted_data.valid_until` = today |
| Betreibungsauszug | `certificate_date` (or upload date) + 90 days = today |
| Salary slips (1–3) | First of the month 3 months after `pay_period` = today |
| Unemployment benefit statements | Same rule as salary slips |
| Guarantor equivalents | Same rules as above |

### Setup (one-time, after deploying)

#### 1. Deploy the edge function

```bash
supabase functions deploy notify-expiring-documents
```

#### 2. Set required secrets

```bash
supabase secrets set \
  CRON_SECRET=<generate-a-random-string> \
  RESEND_API_KEY=<your-resend-api-key> \
  FROM_EMAIL=notifications@checks.ch \
  SITE_URL=https://checks.ch
```

#### 3. Apply the migration

```bash
supabase db push
```

#### 4. Configure the database GUC variables (run once in the Supabase SQL editor)

```sql
ALTER DATABASE postgres
  SET app.settings.edge_function_base_url = 'https://zgcgosfddrihtwpzboiq.supabase.co/functions/v1';

ALTER DATABASE postgres
  SET app.settings.cron_secret = '<same-CRON_SECRET-as-above>';
```

> The `pg_cron` extension must be enabled in your Supabase project (Dashboard → Database → Extensions).
> `pg_net` is enabled by default on Supabase.
