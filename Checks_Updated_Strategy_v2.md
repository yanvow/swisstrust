# CHECKS DOSSIER

## Verified Tenant Platform for Switzerland

### UPDATED STRATEGY & MARKET ANALYSIS

Incorporating the Hybrid Certificate Model, Régie Acquisition Strategy, and Private Owner / Direct Landlord Framework

Prepared: March 2026 | Version 2.0 | Confidential

---

## 1. Executive Summary

Checks Dossier is a verified tenant identity platform designed to solve three converging crises in the Swiss rental market: the worst housing shortage in twelve years, a broken application process that forces tenants to broadcast sensitive personal data dozens of times, and a rising epidemic of identity theft through fake rental ads.

The platform's core innovation is a privacy-preserving QR certificate system that separates identity verification from data sharing. Tenants build their dossier once, get verified by AI, and generate property-specific certificates that share only what's needed – without exposing salary slips, ID copies, or debt records to strangers.

This updated strategy introduces the Hybrid Certificate Model, a fundamental architectural decision that governs how data flows between tenants, agencies (régies), and private owners. The model offers tenants three sharing modes – Directed (pre-authorise a specific régie), Open (any verified professional can access), and On-Request (approve each viewer individually) – giving tenants granular control while eliminating friction for agencies and private owners.

Crucially, this model turns every tenant into a sales channel for régie acquisition. Every certificate delivered to a non-registered régie is an invitation. Every scan by a curious agent is a sign-up prompt. The platform grows from the tenant side up, not the agency side down – solving the classic chicken-and-egg problem that kills two-sided marketplaces.

---

## 2. The Hybrid Certificate Model

The Hybrid Certificate Model is the strategic centrepiece of Checks. It determines how tenant data flows to agencies and landlords, and it is designed to solve three problems simultaneously: tenant privacy, agency adoption, and private owner accessibility.

### 2.1 The Three Sharing Modes

**Mode 1 – Directed:** The tenant generates a certificate and pre-authorises a specific recipient – either a régie (selected from a directory), a named agent within that régie, or a private owner (by email address). The pre-authorised recipient sees the full verified dossier immediately upon scanning the QR code or clicking the link. No approval wait. This is the default for formal applications to known properties.

**Mode 2 – Open:** The certificate grants full dossier access to any verified professional (agent or landlord) who scans it and logs in. This mode is ideal for property viewings where the tenant doesn't know which agent will be present, for Nachmieter transfers where multiple candidates view a property, and for broad job-search-style campaigns where the tenant applies widely. The tenant accepts that their full dossier will be accessible to any verified viewer.

**Mode 3 – On-Request:** The default for privacy-conscious tenants. When a verified professional scans the QR code, they see the public summary (name, verification status, eligibility, occupant count, smoker/pet status). To view the full dossier, they must request access. The tenant receives a push notification and can approve or deny in real-time. A configurable auto-approve timeout (e.g. 24 hours) prevents stale requests from blocking the process.

### 2.2 How the Sharing Flow Works

When a tenant taps 'Generate Certificate', they see:

1. Enter property address and monthly rent (or select from platform listings).
2. Select sharing mode:
   - **Directed → Régie:** Search for régie by name (auto-complete from pre-seeded directory). If found: select agency and optionally a specific agent. If not found: prompt "This agency isn't on Checks yet. Generate an open certificate, or invite them?" with one-tap invitation.
   - **Directed → Private owner:** Enter owner's email address. Owner receives an email with a link to create a free account and view the dossier.
   - **Open:** Any verified professional can view. Confirm with a clear consent message.
   - **On-Request:** You approve each viewer. Confirm.
3. Preview certificate summary.
4. Generate. Download PDF / share link / display QR.

### 2.3 What Each Viewer Sees

| Data Point | Anyone (Public Scan) | Pre-Authorised / Open | On-Request (Pending) |
|---|---|---|---|
| Full name(s) | ✅ Yes | ✅ Yes | ✅ Yes |
| Verification badge | ✅ Yes | ✅ Yes | ✅ Yes |
| Rent eligibility | ✅ Yes | ✅ Yes | ✅ Yes |
| Occupant count | ✅ Yes | ✅ Yes | ✅ Yes |
| Smoker / pets | ✅ Yes | ✅ Yes | ✅ Yes |
| Trust Score (A/B/C) | ✅ Yes | ✅ Yes | ✅ Yes |
| ID / passport copies | ❌ No | ✅ Yes | ⏳ Pending |
| Salary slips | ❌ No | ✅ Yes | ⏳ Pending |
| Betreibungsauszug | ❌ No | ✅ Yes | ⏳ Pending |
| Reference letters | ❌ No | ✅ Yes | ⏳ Pending |
| Insurance / guarantee | ❌ No | ✅ Yes | ⏳ Pending |

This tiered access model is the key nFADP compliance feature: sensitive data is only shared with explicit tenant consent, and every access is logged in a tamper-proof audit trail.

---

## 3. User Types & Account Architecture

### 3.1 Tenant (Individual)

The primary user. Tenants register, build their profile, upload documents for AI verification, and generate QR certificates. They control all data sharing. Free tier includes full profile, 3 certificates/month, and core privacy features. Premium unlocks unlimited certificates, AI cover letters, priority verification, and application tracking.

### 3.2 Régie / Agency (Company)

Property management firms that manage rental portfolios on behalf of owners. Account structure:

**Company account:** Created by the first agent who registers. Contains company name, address, SVIT membership status, logo, verification status. Pays the SaaS subscription.

**Company admin:** The person who created the company account (or anyone promoted to admin). Can invite agents, manage permissions, view billing, see all company applications and listings.

**Agent accounts:** Individual agents within the company. Each has their own login, MFA, and activity log. Permissions set by company admin: can_access_full_dossier, can_post_listings, can_manage_applications.

**Agent onboarding:** Company admin invites agents by email. The agent receives an invitation link, registers their personal account, and is auto-linked to the company. Alternatively, an agent can register independently and request to join a company.

Régie verification is important for trust but must not block adoption. Verification methods (any one is sufficient):

- Company email domain match (e.g. agent@naef.ch matches Naef Immobilier).
- SVIT membership number (verified against SVIT registry).
- Manual admin verification (upload commercial register extract).
- Invitation from an already-verified company admin.

**Critical principle:** An unverified régie can still create an account and receive certificates. They just can't access full dossiers until verified. This removes the registration barrier completely – they sign up to see what tenants are sending them, and verification happens in the background.

### 3.3 Private Owner / Direct Landlord

Individuals who own and manage their own rental properties without a régie. This is 43% of Swiss rental dwellings. Account structure:

**Landlord account:** Registers as 'landlord' role. No company needed. Simplified dashboard: list property, receive applications, view certificates.

**Verification:** Lighter than régie verification. Options: upload Grundbuchauszug (land registry extract), property tax bill, or existing lease showing them as owner. Alternatively, if a tenant sends them a Directed certificate, the email invitation itself serves as an initial trust signal.

**Access model:** Works identically to agents for certificate access. If a tenant pre-authorises them (Directed mode), they see the full dossier immediately. If the certificate is On-Request, the tenant approves. If Open, any verified landlord can access.

**Key difference from régie:** Landlords don't have a company hierarchy, don't need to invite agents, and have a simpler pricing model. They can list 1–3 properties on the free tier.

### 3.4 The Pre-Seeded Régie Directory

To make the Directed certificate flow work from day one, the platform pre-populates a directory of Swiss régies before any of them register. This directory is built from public data: SVIT member lists, commercial registries, Homegate/ImmoScout24/Flatfox listing data, and cantonal régie directories.

Each entry contains: company name, address, canton, phone, email, website, and a flag indicating whether they have an active Checks account. When a tenant selects a régie from this directory:

- If the régie **HAS** an account → the certificate is delivered directly. The agent sees it in their dashboard.
- If the régie **DOES NOT** have an account → the certificate still works as a PDF/link. The régie receives an invitation email: "A verified tenant wants to share their dossier with you. Create a free account to view it." This is tracked as a 'ghost delivery' for sales analytics.

This directory serves three purposes: it makes the tenant flow frictionless, it generates warm leads for régie sales, and it creates a data asset showing which régies receive the most certificate traffic (prioritise sales accordingly).

---

## 4. Market Context

### 4.1 The Housing Crisis

| Metric | Value (2025) |
|---|---|
| National vacancy rate | 1.00% – lowest since 2013 |
| Geneva vacancy rate | 0.34% – tightest in Switzerland |
| Zurich vacancy rate | 0.48% |
| Cantons below 1% vacancy | 15 out of 26 |
| Vacant homes nationwide | 48,000 (−3,600 vs 2024) |
| Vacant rental units | 37,194 (−8% YoY) |
| Net migration (2024) | ~83,000 persons |
| New units delivered (2024) | 40,750 (−12.8% YoY) |
| Renter households | ~2.4 million (61% of all households) |
| Geneva renter share | 78% |
| Asking rent growth | +3–4% per year (2024–2026) |
| Applicants per listing (Geneva) | 50–100+ in desirable neighbourhoods |
| Identity theft via fake ads (2024) | 270 cases reported to NCSC |

The supply-demand imbalance is structural and worsening. Immigration continues to outpace construction. Reference interest rate increases have made new development less profitable. No relief is expected before 2028 at the earliest.

### 4.2 The Application Pain

A standard Swiss rental dossier requires: application form (per régie), ID or passport copies of all occupants including children, residence permit (B/C/G/L), three most recent salary slips or two tax returns, Betreibungsauszug (debt register extract valid 3–6 months), rental guarantee certificate, reference letter from current landlord, liability insurance certificate, and a cover letter with photo. In competitive markets, tenants submit 20–50+ identical dossiers – sharing their most sensitive personal data with strangers each time.

### 4.3 Why Régies Don't Collaborate

Understanding régie resistance is critical to the go-to-market strategy. Agencies resist new platforms because:

- They already have established workflows (paper forms, email, internal software like Rimo, W&W Immo, Garaio REM).
- They see no immediate ROI from adoption – they already get 50–100 applications per listing without any platform.
- They fear losing control of the applicant relationship to a third party.
- They distrust 'standardisation' that treats all agencies the same.
- Switching costs are high: training staff, changing processes, integrating with existing software.
- Past experience with PropTech platforms that promised much and delivered little.

**The strategic insight:** Don't ask régies to change. Let their tenants change for them. The Hybrid Certificate Model means a régie can receive verified dossiers without ever creating an account, without changing any workflow, without adopting any platform. They just scan a QR code. Adoption happens when they realise that scanning is faster than reading paper, and that verified dossiers reduce their fraud risk.

---

## 5. Pain/Gain Analysis by User Type

### 5.1 Tenants

| Current Pains | Checks Gains |
|---|---|
| Rebuild dossier for every application | Build once, generate unlimited certificates |
| Hand ID, salary, debt data to strangers | QR certificate shows eligibility only; full dossier shared with consent |
| No feedback after submitting (black hole) | Application tracking: submitted → viewed → shortlisted → outcome |
| Betreibungsauszug expires every 3 months | Auto-expiry alerts + easy re-upload |
| 270+ identity theft cases via fake ads | Never share sensitive data without knowing who is accessing it |
| Cover letter in 4 languages per application | AI-generated cover letters (Premium) |
| No idea if income qualifies before applying | Pre-qualification check before generating certificate |

### 5.2 Régies / Agencies

| Current Pains | Checks Gains |
|---|---|
| Receive 50–100 paper/email dossiers per listing | Pre-verified, standardised digital dossiers |
| Manually check every document for authenticity | AI-verified with confidence score + Trust Score |
| Risk of fraudulent documents | Verified source documents with tamper-proof trail |
| nFADP compliance burden for handling personal data | Platform handles consent, access logging, data minimisation |
| Incomplete dossiers (missing docs, expired Betreibungsauszug) | Completeness indicator + document freshness checks |
| No way to compare applicants systematically | Trust Score + eligibility + verification status at a glance |

### 5.3 Private Owners / Landlords

| Current Pains | Checks Gains |
|---|---|
| Don't know how to verify tenant documents | AI-verified with trust score – no expertise needed |
| Uncomfortable asking for sensitive financial data | Certificate shows eligibility without revealing salary details |
| Rely on gut feeling / personal impression | Objective Trust Score + verified employment + clean debt record |
| Difficult to find replacement tenants (Nachmieter) | Nachmieter marketplace with verified candidates |
| No tools – just email, paper, and phone calls | Simple dashboard: list property, receive verified applications |
| Fear of choosing a bad tenant (payment default) | Clean Betreibungsauszug + income verification provides assurance |

---

## 6. Competitive Positioning

No existing Swiss platform combines verified tenant identity, privacy-preserving certificates, and a hybrid sharing model that works independently of agency adoption.

| Capability | Homegate | ImmoScout24 | Flatfox | Others | Checks |
|---|---|---|---|---|---|
| Property listings | ✅ | ✅ | ✅ | ✅ | ✅ |
| Digital application | ❌ | ❌ | ✅ | ❌ | ✅ |
| Verified tenant profiles | ❌ | ❌ | ❌ | ❌ | ✅ |
| AI document verification | ❌ | ❌ | ❌ | ❌ | ✅ |
| Privacy-safe QR certificates | ❌ | ❌ | ❌ | ❌ | ✅ |
| Hybrid sharing model | ❌ | ❌ | ❌ | ❌ | ✅ |
| Works off-platform | ❌ | ❌ | ❌ | ❌ | ✅ |
| Private owner support | ❌ | ❌ | Partial | ❌ | ✅ |
| Tenant data control | ❌ | ❌ | ❌ | ❌ | ✅ |
| Nachmieter marketplace | ❌ | ❌ | Partial | ❌ | ✅ |

**Key differentiator:** Checks is the only platform where the product works even if zero régies have accounts. A tenant can generate a certificate, print it, and hand it to anyone. The QR code works. The public summary is visible. The platform extracts value from the certificate as a distribution vehicle, not from the listing as a toll gate.

---

## 7. Updated Business Model

Core principle: Tenants never pay for privacy. The free tier always includes QR certificates in all three sharing modes. Premium is about convenience and speed, not data protection. Régies pay for efficiency, not access. Private owners get a generous free tier to drive adoption.

### 7.1 Tenant Tiers

| Feature | Free | Premium (CHF 9.90–19.90/mo) |
|---|---|---|
| Profile + AI verification | ✅ Full | ✅ Full |
| Certificates (all 3 modes) | 3 per month | Unlimited |
| Document uploads | ✅ Unlimited | ✅ Unlimited |
| Application tracking | Basic (status only) | Full (with notifications) |
| Access log (who viewed dossier) | ✅ Full | ✅ Full |
| AI cover letter generator | ❌ | ✅ DE/FR/IT/EN |
| Smart matching alerts | ❌ | ✅ Real-time |
| Priority verification | Standard (24h) | Fast-track (4h) |
| Competitiveness indicator | ❌ | ✅ |

### 7.2 Régie / Agency Tiers

| Feature | Free Viewer | Starter (99/mo) | Pro (249/mo) | Enterprise (499/mo) |
|---|---|---|---|---|
| View certificates (public) | ✅ | ✅ | ✅ | ✅ |
| View full dossiers | 5/mo | 30/mo | Unlimited | Unlimited |
| Agent seats | 1 | 3 | 10 | Unlimited |
| Post listings | ❌ | 10 | 50 | Unlimited |
| Application management | ❌ | ✅ Basic | ✅ Full | ✅ Full + API |
| Analytics dashboard | ❌ | Basic | Advanced | Custom |
| PM software integration | ❌ | ❌ | ❌ | ✅ API |
| nFADP compliance tools | Basic | ✅ Full | ✅ Full | ✅ Full + DPO |

The Free Viewer tier is the trojan horse. A régie creates an account just to view dossiers that tenants are already sending them. They get 5 full dossier views per month for free. By the time they hit the limit, they've seen the value and upgrading is a natural next step.

### 7.3 Private Owner Pricing

- **Free:** 1 listing, 5 dossier views/month, basic application management.
- **Owner Plus (CHF 19.90/mo):** 3 listings, unlimited dossier views, analytics, priority support.
- Owners never pay SaaS-level prices. They are volume drivers, not revenue centres.

### 7.4 Additional Revenue Streams

- **Featured listings:** CHF 50–150 per listing for boost visibility.
- **Nachmieter service:** CHF 29–49 (one-time) for departing tenants to use the marketplace.
- **Rental guarantee partnerships:** commission from SwissCaution, Firstcaution on referred policies.
- **Moving service partnerships:** referral fees from moving companies, insurers.
- **Data insights (anonymised, aggregated):** market reports for real estate companies (future revenue).

---

## 8. Revised Go-to-Market Strategy

Core strategy shift: Build the tenant base first. Let tenants pull régies onto the platform through certificate traffic. Supplement with targeted B2B sales to high-volume régies. Never gate the tenant experience on régie adoption.

### 8.1 Phase 1: Geneva Beachhead (Months 1–6)

**Tenant acquisition:** Target expat communities first – UN, WHO, WTO, CERN, international schools, relocation agencies. These users face the greatest friction (new country, no references, language barrier), are tech-savvy, and have high willingness to pay for Premium. Content marketing in EN/FR: 'How to rent in Geneva', 'Avoid rental scams in Switzerland', 'What is a Betreibungsauszug?'

**Régie acquisition (passive):** Pre-seed the Geneva régie directory (~200 firms). Every tenant who selects a régie triggers an invitation email. Track ghost deliveries. After 10+ certificates delivered to a régie, trigger a personalised sales outreach: 'You've received 47 verified dossiers from Checks tenants this month. Create a free account to view them.'

**Régie acquisition (active):** Partner with 3–5 Geneva régies for a paid pilot. Offer the first 6 months free. Target mid-size firms (50–200 units) who are big enough to benefit but small enough to decide fast. Use the pilot as a case study.

**Private owner channel:** Target Anibis.ch and Facebook Marketplace rental posters. Content: 'How to verify your next tenant for free.' Partner with liability insurance providers who sell to landlords.

**PR angle:** Identity theft story – pitch to RTS, Tribune de Genève, 20 Minutes. '270 fake rental ad victims in 2024. Here's how to protect yourself.'

**Target:** 5,000 tenant profiles, 3–5 pilot régies, 50+ private owners, 200+ ghost régie deliveries tracked.

### 8.2 Phase 2: Romandie Expansion (Months 6–12)

**Expand:** Lausanne, Vaud, Neuchâtel, Fribourg. Add German support (EN/FR/DE).

**Product:** Launch iOS + Android app. Add property listings. Launch Premium tier. Integrate rental guarantee partnerships (SwissCaution/Firstcaution).

**Régie conversion:** Convert ghost deliveries into accounts. By now, top Geneva régies have received 100+ certificates. Sales team calls with data: 'Here's how many verified dossiers you're missing.' Offer Free Viewer tier – zero commitment.

**Nachmieter launch:** Every departing tenant who uses the Nachmieter feature introduces 5–20 new tenants. This is the organic growth engine.

**Target:** 25,000 tenants, 200 agent accounts (across 40+ régies), 200+ private owners.

### 8.3 Phase 3: German Switzerland (Months 12–18)

**Expand:** Zurich, Bern, Basel, Winterthur, St. Gallen. Full DE/FR/IT/EN.

**Integrations:** API integrations with property management software (Rimo, W&W Immo, Garaio REM). This is what unlocks Enterprise tier sales.

**SVIT partnership:** Approach for endorsement or co-branded solution. SVIT members get preferred onboarding + discount.

**Target:** 80,000 tenants, 600 agent accounts, 1,000+ private owners.

### 8.4 Phase 4: National + Partnerships (Months 18–24)

**Full coverage:** All 26 cantons including Ticino (IT). Romansh support as bonus.

**Portal partnerships:** Approach Homegate and ImmoScout24 for integration – 'Verified by Checks' badge on listings. This is credible once you have 100K+ tenants.

**International:** Evaluate Austria and Germany expansion (similar rental markets, similar pain points).

**Target:** 200,000 tenants, 1,500 agent accounts, 3,000+ private owners, CHF 7M+ ARR.

---

## 9. Régie Acquisition Playbook

The régie acquisition strategy has five layers, ordered from lowest friction to highest commitment.

### 9.1 Layer 1 – Passive Inbound (Certificate-Driven)

Every Directed certificate sent to a non-registered régie triggers an invitation email. The email contains: the tenant's public certificate summary, a CTA to create a free account, and a count of how many certificates they've received from Checks tenants. This is automated, personalised, and scales infinitely.

**Metric:** Track 'ghost deliveries' per régie. Dashboard shows: Naef (47 certs received, 0 account), Pilet & Renaud (31 certs, 0 account), etc.

**Escalation:** At 10 certs → automated follow-up email. At 25 certs → personalised email from sales. At 50 certs → phone call from founder.

### 9.2 Layer 2 – Free Viewer Conversion

When a régie creates a Free Viewer account, they get 5 full dossier views per month. This is enough to experience the value but not enough to rely on. The conversion to Starter (CHF 99/mo) happens when they hit the limit and realise that going back to paper dossiers is worse.

**Onboarding:** When a régie agent creates an account, immediately show them all the certificates that tenants have already sent to their company. 'You have 23 verified dossiers waiting for you.' This is an instant aha moment.

### 9.3 Layer 3 – Flagship Pilot

Sign one prestigious Geneva régie as a design partner. Offer 6 months free on Enterprise tier. Co-develop the agent workflow. Use their logo and testimonial as social proof for all subsequent sales.

**Ideal target:** A mid-large régie (100–500 units) with a tech-forward reputation. Not the biggest (too slow to decide) or the smallest (not enough social proof).

### 9.4 Layer 4 – SVIT Channel

The Swiss Real Estate Association (SVIT) has cantonal sections with members. Approach for:

- Presentation at SVIT events (Romandie, then national).
- Co-branded 'SVIT-verified' badge for member firms.
- Member discount on SaaS plans.
- Joint press release on fraud prevention.

### 9.5 Layer 5 – Enterprise B2B Sales

For the top 20–50 régies nationally (firms managing 500+ units), deploy a direct sales team. The pitch is ROI-based:

- **Time saved:** 15 minutes per application review × 100 applications × 50 listings/year = 1,250 hours saved.
- **Fraud reduction:** every AI-verified dossier eliminates a manual authenticity check.
- **Compliance:** nFADP data handling offloaded to Checks.
- **Integration:** API connects to their existing PM software; no workflow change required.

---

## 10. Updated Financial Projections

| Metric | Year 1 | Year 2 | Year 3 | Year 4 |
|---|---|---|---|---|
| Tenant profiles | 5,000 | 25,000 | 80,000 | 200,000 |
| Premium tenants (conv. %) | 250 (5%) | 2,000 (8%) | 9,600 (12%) | 30,000 (15%) |
| Régie accounts (paid) | 10 | 80 | 300 | 800 |
| Régie Free Viewer accounts | 40 | 120 | 300 | 700 |
| Private owner accounts | 50 | 200 | 800 | 3,000 |
| Agent seats (total) | 30 | 200 | 600 | 1,500 |
| Certificates generated/mo | 2,000 | 15,000 | 60,000 | 180,000 |
| QR scans/month | 800 | 8,000 | 40,000 | 150,000 |
| Ghost deliveries (cumul.) | 500 | 5,000 | 20,000 | 50,000 |

### 10.1 Revenue Breakdown

| Revenue Stream | Year 1 | Year 2 | Year 3 | Year 4 |
|---|---|---|---|---|
| Tenant Premium | CHF 30K | CHF 240K | CHF 1.15M | CHF 3.6M |
| Régie SaaS | CHF 60K | CHF 480K | CHF 1.4M | CHF 2.9M |
| Owner Plus | CHF 5K | CHF 24K | CHF 96K | CHF 360K |
| Listings + services | CHF 15K | CHF 80K | CHF 250K | CHF 600K |
| Partnerships/referrals | CHF 5K | CHF 40K | CHF 150K | CHF 400K |
| **TOTAL ARR** | **CHF 115K** | **CHF 864K** | **CHF 3.05M** | **CHF 7.86M** |

Blended ARPU: CHF 8–12/month across all users (Year 3–4).

Breakeven: ~5,000–8,000 active users (tenant + agent combined). Estimated Month 14–18.

Unit economics: Tenant CAC ~CHF 15–25 (organic/content), agent CAC ~CHF 200–400 (sales-assisted), landlord CAC ~CHF 10–20 (organic). LTV:CAC ratio target >3:1 by Year 2.

---

## 11. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Régies refuse to adopt | High | Hybrid model works without régie accounts. Ghost delivery funnel converts passively. Off-platform certificates remain valuable independently. |
| SMG/Flatfox builds similar | Medium | Flatfox is agent-centric; retrofitting tenant-owned identity is architecturally difficult. Move fast. Build tenant loyalty. Privacy moat. |
| Low tenant adoption | Medium | Expat beachhead has high pain + willingness to pay. Nachmieter viral loop. Off-platform certificates work independently of platform network effects. |
| OCR accuracy errors | Medium | Human-in-the-loop for V1. Clear error correction flow. Invest in accuracy. Never auto-verify below 95% confidence. |
| Data breach | Critical | End-to-end encryption, Swiss hosting, SOC2, annual pen testing, minimal retention. This is existential – invest disproportionately. |
| Regulatory change (nFADP) | Low | Privacy-by-design architecture means tighter regulations help us, not hurt us. Compliance is a competitive advantage. |
| Private owners don't verify | Low | Public certificate already shows enough for shortlisting. Full dossier access via tenant consent (On-Request mode) doesn't require owner verification. |
| Free tier cannibalises revenue | Medium | Free tier is deliberately limited (3 certs, 5 dossier views). Premium conversion driven by power users + competitive markets. |

---

## 12. The Ask

Raising CHF 800K – 1.2M in a Seed round to fund 18 months from MVP to Romandie coverage and path to breakeven.

### 12.1 Use of Funds

| Category | Allocation | Details |
|---|---|---|
| Product Development | 45% | Engineering team (3–4 full-stack, 1 mobile, 1 ML/AI). 7–8 months to MVP. |
| Go-to-Market | 25% | Content marketing, PR, community building, pilot régie partnerships, sales hire. |
| Operations & Legal | 15% | nFADP compliance, legal counsel, Swiss hosting infrastructure, data protection advisor. |
| Working Capital | 15% | 18-month runway buffer to breakeven. |

### 12.2 18-Month Milestones

- 25,000+ tenant profiles with verified documents.
- 200+ agent accounts across 40+ régies.
- 200+ private owner accounts.
- Full Romandie coverage (GE, VD, NE, FR, VS).
- iOS + Android app live.
- 3–5 régie pilot case studies with measurable ROI.
- 1,000+ ghost deliveries converting into warm leads for German Switzerland expansion.
- Path to breakeven demonstrated.

### 12.3 Why Now

- Housing crisis at worst point in 12 years – tenant pain is at maximum.
- nFADP (September 2023) creates regulatory tailwind for privacy-first platforms.
- AI document processing has reached accuracy levels that make automated verification viable.
- No incumbent has built a tenant-owned verified identity layer.
- Flatfox acquisition by SMG creates strategic uncertainty – window for a challenger.

---

*End of Updated Strategy & Market Analysis (v2)*
