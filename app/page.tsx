"use client";

import LandingNav from "./components/LandingNav";
import LandingFooter from "./components/LandingFooter";
import CertPreviewCard from "./components/CertPreviewCard";
import { useT } from "@/lib/i18n";

export default function HomePage() {
  const t = useT();

  return (
    <>
      <LandingNav />

      {/* HERO */}
      <section className="py-16 md:py-24">
        <div className="container-x grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-[60px] items-center">
          <div>
            <div className="section-label">{t("Swiss rental identity platform")}</div>
            <h1>
              {t("One verified dossier.")}
              <br />
              {t("Share it securely with anyone.")
                .split(" ")
                .map((word, i, arr) => {
                  if (i === arr.length - 1) return word;
                  return word + " ";
                })}
            </h1>
            <p className="mt-5 text-base md:text-lg">
              {t(
                "Stop sending your passport, salary slips and debt records to strangers. Verify once. Share a QR certificate. Agencies see exactly what they need — nothing more.",
              )}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/auth/tenant-register.html" className="btn btn-primary btn-lg">
                {t("Create tenant dossier")}
              </a>
              <a href="/auth/agency-register.html" className="btn btn-outline btn-lg">
                {t("Register your agency")}
              </a>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              {t("Free for tenants · Swiss data hosting · nFADP compliant")}
            </p>
          </div>
          <div className="flex justify-center">
            <CertPreviewCard />
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="section-pad bg-gray-100">
        <div className="container-x">
          <div className="section-label">{t("The problem")}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-[60px] items-center">
            <div>
              <h2 className="mb-6">{t("Swiss flat hunting is a privacy nightmare")}</h2>
              <p className="mb-6">
                {t(
                  "For every apartment, tenants hand over their passport, salary slips, debt records and personal references — to complete strangers. Most of those dossiers are never returned. Your data circulates indefinitely.",
                )}
              </p>
              <div className="flex flex-col gap-3">
                <div className="text-sm text-gray-400">
                  {t("Strangers receive your sensitive documents per flat search")}
                </div>
                <div className="text-sm text-gray-400">
                  {t("No agencies have a secure document return policy")}
                </div>
                <div className="text-sm text-gray-400">
                  {t("Many rental applications contain fraudulent documents")}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="card border-l-[3px] border-l-red">
                <div className="text-sm font-bold mb-1">{t("Traditional dossier")}</div>
                <div className="text-xs text-gray-400">
                  {t(
                    "Passport copy sent to strangers · Salary slips emailed as PDFs · No access control · Data never deleted",
                  )}
                </div>
              </div>
              <div className="text-center text-2xl">↓</div>
              <div className="card border-l-[3px] border-l-green">
                <div className="text-sm font-bold mb-1 text-green">{t("Checks certificate")}</div>
                <div className="text-xs text-gray-400">
                  {t(
                    "Verified once · QR code shared · Agency sees only what they're authorised to see · Full audit trail",
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section-pad" id="how-it-works">
        <div className="container-x">
          <div className="text-center mb-12">
            <div className="section-label">{t("How it works")}</div>
            <h2>{t("Three steps to a verified dossier")}</h2>
            <p className="mt-2">
              {t("Complete your profile once. Generate a certificate per property. Done.")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Step
              num="1"
              title={t("Upload documents")}
              desc={t(
                "Passport, salary slips, Extract from the debt enforcement register. Our AI verifies and extracts the data automatically.",
              )}
            />
            <Step
              num="2"
              title={t("Build your dossier")}
              desc={t(
                "Your verified identity, employment and household data — reviewed once, stored securely.",
              )}
            />
            <Step
              num="3"
              title={t("Share a QR certificate")}
              desc={t(
                "Generate a certificate for each property. The agency sees the full dossier. Others see only a verified summary.",
              )}
            />
          </div>
        </div>
      </section>

      {/* CERTIFICATE MODES */}
      <section className="section-pad bg-gray-100">
        <div className="container-x">
          <div className="text-center mb-12">
            <div className="section-label">{t("Two certificate modes")}</div>
            <h2>{t("You choose how your dossier is shared")}</h2>
            <p className="mt-2 max-w-2xl mx-auto">
              {t(
                "Generate a certificate for each property application — you stay in control of who can access your full dossier.",
              )}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[640px] mx-auto mb-12">
            <div className="card border-t-[3px] border-t-charcoal">
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="mb-2">{t("Directed")}</h3>
              <p className="text-sm text-gray-400 mb-4">
                {t(
                  "Pre-authorise one specific régie or landlord. Only they unlock the full dossier when they scan.",
                )}
              </p>
              <div className="text-xs font-semibold text-charcoal">
                {t("Most private — recommended for targeted applications")}
              </div>
            </div>
            <div className="card border-t-[3px] border-t-amber">
              <div className="text-3xl mb-3">🔔</div>
              <h3 className="mb-2">{t("On-Request")}</h3>
              <p className="text-sm text-gray-400 mb-4">
                {t(
                  "Professionals see your public summary and must request access. You approve or deny each one from your dashboard.",
                )}
              </p>
              <div className="text-xs font-semibold text-amber">
                {t("You stay in control — approve each access request")}
              </div>
            </div>
          </div>

          <div className="text-center mb-6">
            <div className="section-label">{t("Access tiers within each mode")}</div>
            <p className="mt-2 max-w-2xl mx-auto">
              {t(
                "Regardless of mode, your raw documents are always protected behind authentication.",
              )}
            </p>
          </div>
          <div className="max-w-[700px] mx-auto border border-gray-200 rounded-[2px] overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white">
                  <th className="text-left text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-3 border-b-2 border-gray-200">
                    {t("Data point")}
                  </th>
                  <th className="text-center text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-3 border-b-2 border-gray-200">
                    {t("Public (anyone)")}
                  </th>
                  <th className="text-center text-xs font-semibold uppercase tracking-wider text-gray-400 px-4 py-3 border-b-2 border-gray-200">
                    {t("Authorised professional")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  [t("Full name"), true, true],
                  [t("Verification badge"), true, true],
                  [t("Rent eligibility (income × 3 rule)"), true, true],
                  [t("Occupants, smoker, pets"), true, true],
                  [t("Certificate status (Valid / Not valid)"), true, true],
                  [t("ID / Passport copy"), false, true],
                  [t("Salary slips"), false, true],
                  [t("Extract from the debt enforcement register"), false, true],
                  [t("Employer & exact income"), false, true],
                ].map(([label, pub, pro], i, arr) => (
                  <tr key={String(label)} className={i < arr.length - 1 ? "border-b border-gray-200" : ""}>
                    <td className="px-4 py-3">{label}</td>
                    <td className="px-4 py-3 text-center">
                      {pub ? <span className="text-green">✓</span> : <span>🔒</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-green">{pro ? "✓" : "🔒"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CERTIFICATE STATUS */}
      <section className="section-pad">
        <div className="container-x">
          <div className="text-center mb-12">
            <div className="section-label">{t("Certificate status")}</div>
            <h2>{t("Instant signal for agencies")}</h2>
            <p className="mt-2 max-w-2xl mx-auto">
              {t(
                "Every certificate is either Valid or Not Valid — based on whether required documents are present and up to date.",
              )}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[640px] mx-auto">
            <div className="card text-center">
              <div className="badge badge-green text-base px-6 py-2 mx-auto mb-4">
                {t("✓ Valid")}
              </div>
              <h3 className="mt-4">{t("Valid")}</h3>
              <p className="text-sm mt-2">
                {t(
                  "All required documents are verified and up to date. Clean debt enforcement register and current income documents.",
                )}
              </p>
            </div>
            <div className="card text-center">
              <div className="badge badge-red text-base px-6 py-2 mx-auto mb-4">
                {t("✗ Not valid")}
              </div>
              <h3 className="mt-4">{t("Not valid")}</h3>
              <p className="text-sm mt-2">
                {t(
                  "One or more documents are missing, expired, or rejected. The tenant must update their dossier to restore validity.",
                )}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AGENCY PITCH */}
      <section className="section-pad bg-charcoal text-white" id="agencies">
        <div className="container-x">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-[60px] items-center">
            <div>
              <div className="section-label !text-red">{t("For agencies")}</div>
              <h2 className="text-white">{t("Stop processing fraudulent dossiers")}</h2>
              <p className="mt-4 mb-8 text-gray-200">
                {t(
                  "Every Checks certificate is backed by AI-verified documents. You see the original files, extracted data, and a clear Valid / Not valid status — in seconds.",
                )}
              </p>
              <div className="flex flex-col gap-4 mb-8">
                <AgencyBullet
                  title={t("Verified documents only")}
                  desc={t(
                    "AI confidence scoring flags suspicious or unreadable documents before they reach you.",
                  )}
                />
                <AgencyBullet
                  title={t("Full audit trail")}
                  desc={t(
                    "Every access is logged. Know exactly who viewed which dossier and when.",
                  )}
                />
                <AgencyBullet
                  title={t("One-click comparison")}
                  desc={t(
                    "Compare applicants side by side — eligibility, certificate status, household details — from your dashboard.",
                  )}
                />
              </div>
              <a href="/auth/agency-register.html" className="btn btn-primary btn-lg">
                {t("Register your agency — free")}
              </a>
            </div>
            <div>
              <div className="bg-gray-800 rounded-[2px] p-5 border border-[#444]">
                <div className="text-xs text-gray-400 mb-3 font-semibold tracking-wider uppercase">
                  {t("Agency dashboard")}
                </div>
                <div className="flex flex-col gap-2">
                  <DashRow name="Anna M." line="Rue de Rive 14 · 3.5 rooms · CHF 2,400" status="valid" elig={t("Eligible")} validLabel={t("✓ Valid")} />
                  <DashRow name="Marc D." line="Avenue de la Gare 8 · 2.5 rooms · CHF 1,800" status="valid" elig={t("Eligible")} validLabel={t("✓ Valid")} />
                  <DashRow name="Lukas B." line="Bahnhofstrasse 22 · 4 rooms · CHF 3,200" status="invalid" elig={t("Review")} validLabel={t("✗ Not valid")} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRIVATE OWNERS */}
      <section className="section-pad" id="owners">
        <div className="container-x">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-[60px] items-center">
            <div>
              <div className="section-label !text-blue">{t("For private owners")}</div>
              <h2>{t("Rent out your property with confidence")}</h2>
              <p className="mt-4 mb-8">
                {t(
                  "No régie needed. As a private landlord, register a free account and scan any Checks QR code to instantly see a tenant's verified dossier — income, documents, and certificate status.",
                )}
              </p>
              <div className="flex flex-col gap-4 mb-8">
                <OwnerBullet
                  title={t("No subscription needed")}
                  desc={t(
                    "Free plan lets you view approved On-Request certificates and Directed certificates addressed to you.",
                  )}
                />
                <OwnerBullet
                  title={t("Same verified quality as agencies")}
                  desc={t(
                    "AI-verified documents and certificate status — same as what a régie sees.",
                  )}
                />
                <OwnerBullet
                  title={t("Request access for Directed certificates")}
                  desc={t(
                    "If a tenant uses Directed mode, you can request access and they approve directly.",
                  )}
                />
              </div>
              <a href="/auth/owner-register.html" className="btn btn-outline btn-lg">
                {t("Register as private owner — free")}
              </a>
            </div>
            <div className="flex flex-col gap-4">
              <div className="card border-l-[3px] border-l-amber">
                <div className="text-sm font-bold mb-1">{t("On-Request certificate scan")}</div>
                <div className="text-xs text-gray-400">
                  {t(
                    "Sign in → scan QR → tap \"Request access\" → tenant approves → full dossier unlocked.",
                  )}
                </div>
              </div>
              <div className="card border-l-[3px] border-l-gray-300">
                <div className="text-sm font-bold mb-1">{t("Directed certificate scan")}</div>
                <div className="text-xs text-gray-400">
                  {t(
                    "Only works if the tenant pre-authorised you. Otherwise shows public summary only.",
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="section-pad bg-gray-100 text-center">
        <div className="container-x">
          <div className="section-label">{t("Get started today")}</div>
          <h2 className="max-w-[600px] mx-auto mb-4">
            {t("Your dossier. Your data. Your control.")}
          </h2>
          <p className="max-w-[480px] mx-auto mb-9">
            {t(
              "Verify once. Apply everywhere. Choose exactly how each certificate is shared.",
            )}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="/auth/tenant-register.html" className="btn btn-primary btn-lg">
              {t("Create tenant dossier")}
            </a>
            <a href="/auth/agency-register.html" className="btn btn-outline btn-lg">
              {t("Register agency")}
            </a>
            <a href="/auth/owner-register.html" className="btn btn-ghost btn-lg">
              {t("Private owner →")}
            </a>
          </div>
          <p className="text-xs text-gray-400 mt-6">
            {t("Already have an account?")}{" "}
            <a href="/auth/login.html" className="text-charcoal font-semibold">
              {t("Sign in →")}
            </a>
          </p>
        </div>
      </section>

      <LandingFooter />
    </>
  );
}

function Step({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div>
      <div className="w-10 h-10 bg-charcoal text-white rounded-[2px] flex items-center justify-center font-bold mb-4">
        {num}
      </div>
      <div className="font-semibold mb-2">{title}</div>
      <div className="text-sm text-gray-600">{desc}</div>
    </div>
  );
}

function AgencyBullet({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="text-red text-xl leading-none mt-0.5">✓</span>
      <div>
        <div className="font-semibold text-white">{title}</div>
        <div className="text-sm text-gray-400">{desc}</div>
      </div>
    </div>
  );
}

function OwnerBullet({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="text-blue text-xl leading-none mt-0.5">✓</span>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-gray-500">{desc}</div>
      </div>
    </div>
  );
}

function DashRow({
  name,
  line,
  status,
  elig,
  validLabel,
}: {
  name: string;
  line: string;
  status: "valid" | "invalid";
  elig: string;
  validLabel: string;
}) {
  return (
    <div className="bg-[#1A1A1A] border border-[#333] px-3.5 py-3 rounded-[2px] flex items-center justify-between">
      <div>
        <div className="text-sm font-semibold text-white">{name}</div>
        <div className="text-xs text-gray-400">{line}</div>
      </div>
      <div className="flex gap-1.5 items-center">
        <span className={`badge ${status === "valid" ? "badge-green" : "badge-red"} text-[0.7rem]`}>
          {validLabel}
        </span>
        <span className={`badge ${status === "valid" ? "badge-green" : "badge-amber"} text-[0.7rem]`}>
          {elig}
        </span>
      </div>
    </div>
  );
}
