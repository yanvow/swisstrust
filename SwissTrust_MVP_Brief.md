# SwissTrust Dossier — MVP Build Brief
**Version:** MVP (Single-pass) | **Date:** March 2026 | **Confidential**

---

## What We're Building
A verified tenant identity platform for the Swiss rental market. Tenants verify their identity once, build a dossier, and generate a QR certificate that shows basic info to anyone — but unlocks the full dossier only for the authorised agency.

---

## MVP Scope (4 modules)

### 1. Landing Page
A public marketing page explaining:
- The problem: tenants submit sensitive documents to 20–50+ strangers per flat hunt
- The solution: build your dossier once, share a QR certificate with granular access control
- Key benefits for tenants (privacy, speed) and agencies (verified dossiers, fraud prevention)
- CTAs: "Create Tenant Account" and "Register Your Agency"

---

### 2. Tenant App

**Registration & Profile**
- Single employed tenant (no co-tenants for MVP)
- Full Swiss rental dossier profile fields:
  - Personal: Full name, date of birth, nationality, current address
  - Residency: Permit type (Swiss / B / C / G / L)
  - Employment: Employer name, role, start date, monthly gross salary
  - Household: Occupant count, smoker (Y/N), pets (Y/N)

**Document Upload + OCR**
Upload the following documents; AI (Claude Vision) auto-extracts and pre-fills fields:
- Passport or Swiss ID
- Residence permit (if applicable)
- 3 most recent salary slips → extracts monthly income, employer name
- Betreibungsauszug (debt register extract) → extracts clean/not clean status
- Current landlord reference letter

Confidence threshold: ≥0.90 = auto-verified | 0.65–0.89 = flagged for review | <0.65 = rejected with plain-language reason.

**Certificate Generation**
Once profile is validated, tenant fills in the following per-property fields (variable per certificate, modelled on real régie forms like Moser Vernet):

*Property details:*
- Property address (street, city, postcode)
- Number of rooms (Nbr de pièces)
- Floor (Etage)
- Desired move-in date
- Desired rent: split into Rent / Charges / Total (CHF)
- Parking desired (yes/no)
- Has visited the property (yes/no)
- How did you hear about this property (dropdown: former tenant, relocation agency, website, immobilier.ch, other)

*Authorised viewer:*
- Pick agency from pre-seeded dropdown list of Swiss régies

These property-specific fields appear on the certificate alongside the tenant's verified profile data. The tenant profile (identity, income, Betreibungsauszug, etc.) is fixed and pulled automatically — only these fields change per certificate.

Generates a unique certificate containing:
- QR code (scan to open certificate page)
- Alphanumeric verification code (e.g. `STD-2G7K-X4NP`) — manually entered on a public verification page at `/verify`

Both methods resolve to the same URL and the same tiered access logic.

---

### 3. QR Certificate — Tiered Access Logic

| Data Point | Public (anyone scans) | Agency (authorised régie scans) |
|---|---|---|
| Full name | ✅ | ✅ |
| Verification badge | ✅ | ✅ |
| Rent eligibility (income × 3 rule) | ✅ | ✅ |
| Occupant count, smoker, pets | ✅ | ✅ |
| Trust Score (A/B/C) | ✅ | ✅ |
| ID / passport copy | ❌ | ✅ |
| Salary slips | ❌ | ✅ |
| Betreibungsauszug | ❌ | ✅ |
| Reference letter | ❌ | ✅ |
| Employer & income details | ❌ | ✅ |

Access detection: both the QR scan and manual code entry resolve to the same certificate page. The page checks if the logged-in viewer's account matches the agency selected at certificate generation. No match (or not logged in) = public summary only.

---

### 4. Agency App

**Registration**
- Company name, address, contact email
- Agency added to the pre-seeded directory (so tenants can select them)

**Dashboard**
- List of certificates directed to this agency
- Click to view full dossier for each certificate
- Basic applicant comparison view (Trust Score, eligibility, verification status)

---

## Tech Notes
- Stack: your choice (suggest Next.js + Postgres + Prisma)
- AI document extraction: Claude Vision via `@anthropic-ai/sdk` (`claude-opus-4-6`)
- PDF-to-image for OCR: `pdf2pic`
- QR generation: standard library (e.g. `qrcode`)
- Auth: email/password + session-based, separate flows for tenant vs agency
- Compliance note: Swiss hosting preferred; all document access must be logged

---

## Out of Scope for MVP
- Co-tenants / families
- Open and On-Request sharing modes (Directed only for MVP)
- Mobile app
- Listings / property search
- Premium tier / payments
- Nachmieter marketplace
- PM software integrations
- Email invitation / ghost delivery tracking

---

## Success Criteria
- Tenant can register, upload docs, get OCR extraction, and generate a QR certificate in under 10 minutes
- Public QR scan shows only the summary tier
- Agency login + QR scan shows the full verified dossier
- Agency can register and appears in tenant's dropdown immediately
