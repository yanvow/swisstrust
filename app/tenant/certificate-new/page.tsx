"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useTenant } from "../_components/TenantContext";
import { useT } from "@/lib/i18n";
import AddressAutocomplete from "@/lib/AddressAutocomplete";

type Tenant = {
  id: string;
  full_name: string | null;
  monthly_gross_salary: number | null;
  occupant_count: number | null;
  is_smoker: boolean | null;
  has_pets: boolean | null;
  nationality: string | null;
  is_employee: boolean | null;
  is_self_employed: boolean | null;
  is_unemployed: boolean | null;
  is_on_welfare: boolean | null;
  needs_guarantor: boolean | null;
  is_gov_info_locked: boolean | null;
  gov_info_review_requested: boolean | null;
  guarantor_is_gov_info_locked: boolean | null;
  guarantor_gov_info_review_requested: boolean | null;
};

type Doc = {
  doc_type: string;
  status: string;
  created_at: string;
  ocr_extracted_data: Record<string, string> | null;
};

type Agency = { id: string; label: string; sub: string };

type Mode = "directed" | "on_request";
type DirectedType = "agency" | "owner";

function computeCertValidity(docs: Doc[], tenant: Tenant): { valid: boolean; reasons: string[] } {
  const byType: Record<string, Doc> = {};
  docs.forEach((d) => {
    byType[d.doc_type] = d;
  });
  const now = new Date();
  const reasons: string[] = [];
  const present = (type: string) => byType[type] && byType[type].status !== "rejected";

  if (present("passport_id") && !tenant.is_gov_info_locked) {
    if (tenant.gov_info_review_requested) {
      reasons.push("Government identity review pending — awaiting admin approval");
    } else {
      reasons.push("Government identity not locked — go to Documents to verify and lock your identity");
    }
  }
  if (
    tenant.needs_guarantor &&
    present("guarantor_id") &&
    !tenant.guarantor_is_gov_info_locked
  ) {
    if (tenant.guarantor_gov_info_review_requested) {
      reasons.push("Guarantor identity review pending — awaiting admin approval");
    } else {
      reasons.push(
        "Guarantor identity not locked — go to Documents to verify and lock the guarantor's identity",
      );
    }
  }
  if (!present("passport_id")) {
    reasons.push("Passport / ID missing or rejected");
  } else {
    const exp = byType.passport_id.ocr_extracted_data?.expiry_date;
    if (exp && new Date(exp) < now) reasons.push("Passport / ID expired");
  }
  const nat = tenant.nationality;
  if (nat && nat !== "Swiss") {
    if (!present("residence_permit")) reasons.push("Residence permit missing or rejected");
    else {
      const exp = byType.residence_permit.ocr_extracted_data?.valid_until;
      if (exp && new Date(exp) < now) reasons.push("Residence permit expired");
    }
  }
  if (!present("betreibungsauszug")) {
    reasons.push("Betreibungsauszug missing or rejected");
  } else {
    const d = byType.betreibungsauszug;
    const base = d.ocr_extracted_data?.certificate_date
      ? new Date(d.ocr_extracted_data.certificate_date)
      : new Date(d.created_at);
    const expiry = new Date(base);
    expiry.setDate(expiry.getDate() + 90);
    if (now > expiry) reasons.push("Betreibungsauszug expired (older than 90 days)");
  }

  const cutoff = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const slipOk = (type: string) => {
    if (!present(type)) return false;
    const pp = byType[type].ocr_extracted_data?.pay_period;
    if (!pp) return true;
    const [y, m] = pp.split("-").map(Number);
    return new Date(y, m - 1, 1) >= cutoff;
  };

  if (tenant.is_employee) {
    if (!slipOk("salary_slip_1") || !slipOk("salary_slip_2") || !slipOk("salary_slip_3")) {
      reasons.push("Salary slips missing, rejected, or outdated");
    }
  }
  if (tenant.is_self_employed) {
    if (!present("balance_sheet")) reasons.push("Balance sheet missing or rejected");
    if (!present("tax_assessment")) reasons.push("Tax assessment missing or rejected");
  }
  if (tenant.is_unemployed) {
    if (
      !slipOk("unemployment_benefit_1") ||
      !slipOk("unemployment_benefit_2") ||
      !slipOk("unemployment_benefit_3")
    ) {
      reasons.push("Unemployment benefit statements missing, rejected, or outdated");
    }
  }
  if (tenant.is_on_welfare && !present("welfare_rent_coverage")) {
    reasons.push("Welfare / rent coverage letter missing or rejected");
  }

  return { valid: reasons.length === 0, reasons };
}

function generateCertCode(): string {
  const alpha = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rand = (n: number) =>
    Array.from({ length: n }, () => alpha[Math.floor(Math.random() * alpha.length)]).join("");
  return `STD-${rand(4)}-${rand(4)}`;
}

export default function NewCertificatePage() {
  const t = useT();
  const { userId, email } = useTenant();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [validity, setValidity] = useState<{ valid: boolean; reasons: string[] } | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [mode, setMode] = useState<Mode>("directed");
  const [directedType, setDirectedType] = useState<DirectedType>("agency");

  const [agencySearch, setAgencySearch] = useState("");
  const [agencyId, setAgencyId] = useState("");
  const [agencyDropOpen, setAgencyDropOpen] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ghostFormOpen, setGhostFormOpen] = useState(false);
  const [ghostAgencyName, setGhostAgencyName] = useState("");
  const [copiedInvite, setCopiedInvite] = useState(false);

  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [rooms, setRooms] = useState("");
  const [floor, setFloor] = useState("");
  const [movein, setMovein] = useState("");
  const [moveinErr, setMoveinErr] = useState<string | null>(null);
  const [rent, setRent] = useState("");
  const [charges, setCharges] = useState("");
  const [parking, setParking] = useState(false);
  const [visited, setVisited] = useState(true);
  const [heardVia, setHeardVia] = useState("");
  const [motivation, setMotivation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [agencyHintErr, setAgencyHintErr] = useState<string | null>(null);

  const total = Math.max(0, parseFloat(rent) || 0) + Math.max(0, parseFloat(charges) || 0);

  useEffect(() => {
    const sb = createClient();
    (async () => {
      const { data: tenantRow } = await sb
        .from("tenants")
        .select("*")
        .eq("user_id", userId)
        .single<Tenant>();
      setTenant(tenantRow);

      if (tenantRow) {
        const { data: docData } = await sb
          .from("documents")
          .select("doc_type, status, created_at, ocr_extracted_data")
          .eq("tenant_id", tenantRow.id);
        const docList = (docData as Doc[]) || [];
        setDocs(docList);
        setValidity(computeCertValidity(docList, tenantRow));
      }

      const { data: agenciesData } = await sb
        .from("agencies")
        .select("id, company_name, address")
        .order("company_name");
      setAgencies(
        ((agenciesData as { id: string; company_name: string; address: string }[]) || []).map(
          (a) => ({
            id: a.id,
            label: a.company_name,
            sub: (a.address || "").split(",").slice(-1)[0]?.trim() || "",
          }),
        ),
      );

      setLoaded(true);
    })();
  }, [userId]);

  const eligibilityHint = (() => {
    if (!tenant || !total) return null;
    const salary = tenant.monthly_gross_salary || 0;
    const needed = total * 3;
    if (salary >= needed) {
      return {
        kind: "ok" as const,
        msg: `✓ ${t("Income eligible")} — CHF ${salary.toLocaleString()} ≥ 3× CHF ${total.toLocaleString()} (CHF ${needed.toLocaleString()})`,
      };
    }
    return {
      kind: "warn" as const,
      msg: `⚠ ${t("Income may not meet eligibility")} — CHF ${salary.toLocaleString()} < 3× CHF ${total.toLocaleString()} (CHF ${needed.toLocaleString()})`,
    };
  })();

  const filteredAgencies = (() => {
    const q = agencySearch.trim().toLowerCase();
    if (!q) return agencies;
    return agencies.filter(
      (a) => a.label.toLowerCase().includes(q) || a.sub.toLowerCase().includes(q),
    );
  })();
  const agencyNotFound = filteredAgencies.length === 0 && agencySearch.trim().length > 1;

  function copyInvite() {
    const regUrl = window.location.origin + "/auth/agency-register";
    const msg = agencySearch.trim()
      ? t(
          "Hi, I'd like to share my Checks tenant dossier with {agency}. Please register your agency at: {url}",
        )
          .replace("{agency}", agencySearch.trim())
          .replace("{url}", regUrl)
      : t("Register your agency on Checks to receive verified tenant dossiers: {url}").replace(
          "{url}",
          regUrl,
        );
    navigator.clipboard.writeText(msg).then(() => {
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMoveinErr(null);
    setAgencyHintErr(null);
    if (!tenant) {
      alert(t("Please complete your profile first."));
      return;
    }

    let pickedAgencyId: string | null = null;
    let pickedOwnerEmail: string | null = null;
    let unregisteredAgencyName: string | null = null;
    if (mode === "directed") {
      if (directedType === "agency") {
        if (!agencyId) {
          if (ghostFormOpen && ghostAgencyName.trim()) {
            unregisteredAgencyName = ghostAgencyName.trim();
          } else {
            setAgencyHintErr(
              t("Please select an agency from the list, or use one of the options below."),
            );
            return;
          }
        } else {
          pickedAgencyId = agencyId;
        }
      } else {
        if (!ownerEmail.trim()) {
          alert(t("Please enter the landlord email address."));
          return;
        }
        pickedOwnerEmail = ownerEmail.trim().toLowerCase();
      }
    }

    if (movein) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      if (new Date(movein + "T00:00:00") < tomorrow) {
        setMoveinErr(t("Move-in date must be tomorrow or later."));
        return;
      }
    }

    setSubmitting(true);
    const sb = createClient();
    const { data: latestDocs } = await sb
      .from("documents")
      .select("doc_type, status, created_at, ocr_extracted_data")
      .eq("tenant_id", tenant.id);
    const check = computeCertValidity((latestDocs as Doc[]) || [], tenant);
    if (!check.valid) {
      setSubmitting(false);
      alert(
        t("Cannot generate certificate — the following issues must be resolved first:") +
          "\n\n• " +
          check.reasons.join("\n• "),
      );
      return;
    }

    const salary = tenant.monthly_gross_salary || 0;
    const isEligible = salary >= total * 3;
    const certCode = generateCertCode();
    const qrUrl = `${window.location.origin}/cert/cert-view?code=${certCode}`;

    const { error } = await sb.from("certificates").insert({
      tenant_id: tenant.id,
      agency_id: pickedAgencyId,
      owner_email: pickedOwnerEmail,
      unregistered_agency_name: unregisteredAgencyName,
      property_address: street.trim(),
      property_city: city.trim(),
      property_postcode: postcode.trim(),
      rooms: parseFloat(rooms) || null,
      floor: floor.trim() || null,
      move_in_date: movein || null,
      rent_chf: parseFloat(rent) || null,
      charges_chf: parseFloat(charges) || null,
      total_chf: total,
      parking_desired: parking,
      has_visited: visited,
      heard_about: heardVia || null,
      mode,
      is_eligible: isEligible,
      cert_code: certCode,
      qr_url: qrUrl,
      motivation_letter: motivation.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      alert(t("Error generating certificate") + ": " + error.message);
      return;
    }
    window.location.href = `/tenant/certificates?new=${certCode}`;
  }

  const submitDisabled = !loaded || !tenant || (validity ? !validity.valid : false);

  return (
    <>
      <h1 className="text-2xl font-bold">{t("New certificate")}</h1>
      <p className="text-gray-400 text-sm mt-1 mb-6">
        {t("Fill in the property details. Your verified profile is added automatically.")}
      </p>

      <div className="card mb-6" style={{ background: "var(--gray-100)", border: "none" }}>
        <div className="flex items-center gap-3 mb-2">
          <div
            className="verified-badge"
            style={{ fontSize: ".8rem", padding: "5px 12px" }}
          >
            ✓ {t("Identity Verified")}
          </div>
          {validity ? (
            <span
              className={`badge ${validity.valid ? "badge-green" : "badge-red"}`}
              title={validity.valid ? "" : validity.reasons.join("\n")}
            >
              {validity.valid
                ? `✓ ${t("Profile & documents valid")}`
                : `✗ ${t("Profile not ready")}`}
            </span>
          ) : (
            <span className="badge badge-gray">{t("Checking…")}</span>
          )}
        </div>
        <div className="text-sm text-gray-400">
          {t("Your tenant data is pre-filled")}:{" "}
          <strong className="text-charcoal">{tenant?.full_name || email}</strong> · CHF{" "}
          {(tenant?.monthly_gross_salary || 0).toLocaleString()}/mo {t("gross")} ·{" "}
          {tenant?.occupant_count || 1} {t("occupant(s)")} ·{" "}
          {tenant?.is_smoker ? t("Smoker") : t("No smoker")} ·{" "}
          {tenant?.has_pets ? t("Pets") : t("No pets")}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <fieldset className="fieldset">
          <legend>{t("Sharing mode")}</legend>
          <p className="text-sm text-gray-400 mb-4">
            {t("Choose who can access your full dossier when they scan the QR code.")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <ModeCard
              selected={mode === "directed"}
              onClick={() => setMode("directed")}
              icon="🎯"
              title={t("Directed")}
              desc={t("Full dossier visible only to the one agency or landlord you pre-authorise.")}
              badge={t("Most private")}
              badgeColor="var(--charcoal)"
            />
            <ModeCard
              selected={mode === "on_request"}
              onClick={() => setMode("on_request")}
              icon="🔔"
              title={t("On-Request")}
              desc={t(
                "Professionals see your public summary and request access. You approve or deny each one.",
              )}
              badge={t("You stay in control")}
              badgeColor="var(--amber)"
            />
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend>{t("Property details")}</legend>
          <div className="form-group">
            <label>
              {t("Property street address")} <span className="req">*</span>
            </label>
            <AddressAutocomplete
              value={street}
              onChange={setStreet}
              required
              placeholder={t("Start typing a Swiss address…")}
              onSelect={({ city: c, postcode: pc }) => {
                setCity(c);
                setPostcode(pc);
              }}
            />
            <div className="form-hint">
              {t(
                "Select from the dropdown — city, canton and postcode will fill automatically.",
              )}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>
                {t("City")} <span className="req">*</span>
              </label>
              <input
                type="text"
                placeholder="—"
                readOnly
                required
                className="input-autofilled"
                value={city}
              />
            </div>
            <div className="form-group">
              <label>
                {t("Postcode")} <span className="req">*</span>
              </label>
              <input
                type="text"
                placeholder="—"
                readOnly
                required
                className="input-autofilled"
                value={postcode}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>
                {t("Number of rooms (Nbr de pièces)")} <span className="req">*</span>
              </label>
              <input
                type="number"
                placeholder="3.5"
                step={0.5}
                min={1}
                required
                value={rooms}
                onChange={(e) => setRooms(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>{t("Floor (Étage)")}</label>
              <input
                type="text"
                placeholder="2nd"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label>
              {t("Desired move-in date")} <span className="req">*</span>
            </label>
            <input
              type="date"
              required
              value={movein}
              onChange={(e) => setMovein(e.target.value)}
            />
            {moveinErr && <div className="text-red text-sm mt-1">{moveinErr}</div>}
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend>{t("Desired rent (CHF)")}</legend>
          <div className="form-row-3">
            <div className="form-group">
              <label>
                {t("Rent (loyer)")} <span className="req">*</span>
              </label>
              <input
                type="number"
                placeholder="2200"
                min={0}
                required
                value={rent}
                onChange={(e) => setRent(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>
                {t("Charges")} <span className="req">*</span>
              </label>
              <input
                type="number"
                placeholder="200"
                min={0}
                value={charges}
                onChange={(e) => setCharges(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>{t("Total")}</label>
              <input
                type="number"
                placeholder="2400"
                readOnly
                value={total || ""}
                style={{ background: "var(--gray-100)" }}
              />
            </div>
          </div>
          {eligibilityHint && (
            <div
              className="form-hint"
              style={{ color: eligibilityHint.kind === "ok" ? "var(--green)" : "var(--red)" }}
            >
              {eligibilityHint.msg}
            </div>
          )}
        </fieldset>

        <fieldset className="fieldset">
          <legend>{t("Additional information")}</legend>
          <div className="flex flex-col">
            <div className="toggle-row">
              <div className="text-[0.9rem] font-medium">{t("Parking desired")}</div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={parking}
                  onChange={(e) => setParking(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="toggle-row">
              <div className="text-[0.9rem] font-medium">{t("I have visited the property")}</div>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={visited}
                  onChange={(e) => setVisited(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
          <div className="form-group mt-4">
            <label>
              {t("How did you hear about this property?")} <span className="req">*</span>
            </label>
            <select required value={heardVia} onChange={(e) => setHeardVia(e.target.value)}>
              <option value="">{t("Select…")}</option>
              <option value="former_tenant">{t("Former tenant")}</option>
              <option value="relocation_agency">{t("Relocation agency")}</option>
              <option value="website">{t("Agency website")}</option>
              <option value="immobilier_ch">immobilier.ch</option>
              <option value="other">{t("Other")}</option>
            </select>
          </div>
        </fieldset>

        {mode === "directed" && (
          <fieldset className="fieldset">
            <legend>{t("Authorised recipient")}</legend>
            <div className="flex gap-2 mb-5">
              <DirectedTypeBtn
                active={directedType === "agency"}
                onClick={() => setDirectedType("agency")}
              >
                🏢 {t("Agency / régie")}
              </DirectedTypeBtn>
              <DirectedTypeBtn
                active={directedType === "owner"}
                onClick={() => setDirectedType("owner")}
              >
                👤 {t("Private landlord")}
              </DirectedTypeBtn>
            </div>

            {directedType === "agency" && (
              <div className="form-group mb-0">
                <label>
                  {t("Select the régie managing this property")} <span className="req">*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder={t("Type to search agencies…")}
                    autoComplete="off"
                    value={agencySearch}
                    onChange={(e) => {
                      setAgencySearch(e.target.value);
                      setAgencyId("");
                      setAgencyDropOpen(true);
                    }}
                    onFocus={() => !agencyId && setAgencyDropOpen(true)}
                    onBlur={() => setTimeout(() => setAgencyDropOpen(false), 150)}
                  />
                  {agencyDropOpen && filteredAgencies.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: "100%",
                        background: "white",
                        border: "1px solid var(--gray-200)",
                        borderTop: "none",
                        borderRadius: "0 0 var(--radius) var(--radius)",
                        maxHeight: 220,
                        overflowY: "auto",
                        zIndex: 50,
                        boxShadow: "var(--shadow)",
                      }}
                    >
                      {filteredAgencies.map((a) => (
                        <div
                          key={a.id}
                          onMouseDown={() => {
                            setAgencyId(a.id);
                            setAgencySearch(a.label);
                            setAgencyDropOpen(false);
                          }}
                          style={{
                            padding: "10px 14px",
                            cursor: "pointer",
                            fontSize: ".875rem",
                            borderBottom: "1px solid var(--gray-100)",
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{a.label}</div>
                          {a.sub && (
                            <div style={{ fontSize: ".78rem", color: "var(--gray-400)" }}>
                              {a.sub}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-hint">
                  {agencyHintErr || t("Only this agency will have access to your full dossier.")}
                </div>

                {agencyNotFound && (
                  <div
                    className="mt-3 rounded-[2px] p-4"
                    style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}
                  >
                    <div className="font-semibold text-sm mb-1.5">
                      {t("Agency not on Checks yet?")}
                    </div>
                    <div className="text-sm text-gray-400 mb-3">
                      {t("You can still apply — choose one of these options:")}
                    </div>
                    <div className="flex gap-2 flex-wrap mb-3">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setMode("on_request")}
                      >
                        {t("Switch to On-Request mode")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={copyInvite}
                      >
                        📋 {copiedInvite ? `✓ ${t("Copied!")}` : t("Copy invite link")}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setGhostFormOpen((v) => !v);
                          if (!ghostFormOpen) setGhostAgencyName(agencySearch.trim());
                        }}
                      >
                        📨 {t("Direct by name anyway")}
                      </button>
                    </div>
                    {ghostFormOpen && (
                      <div
                        className="pt-3 mt-1"
                        style={{ borderTop: "1px solid #FED7AA" }}
                      >
                        <div className="text-sm text-gray-400 mb-2">
                          {t(
                            "Your certificate will be held for this agency. They'll see it the moment they join Checks — no action needed on your part.",
                          )}
                        </div>
                        <div className="form-group mb-2">
                          <label className="text-[0.8125rem]">
                            {t("Agency name (as it will appear)")} <span className="req">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder={t("e.g. Agence Dupont & Fils")}
                            className="text-sm"
                            value={ghostAgencyName}
                            onChange={(e) => setGhostAgencyName(e.target.value)}
                          />
                        </div>
                        <div className="text-xs text-gray-400">
                          {t(
                            "The certificate will be created in Directed mode. The agency must sign up with this exact name to claim it.",
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {directedType === "owner" && (
              <div className="form-group mb-0">
                <label>
                  {t("Landlord email address")} <span className="req">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="landlord@example.com"
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                />
                <div className="form-hint">
                  {t(
                    "The landlord must sign in with this exact email to access your full dossier.",
                  )}
                </div>
              </div>
            )}
          </fieldset>
        )}

        {mode === "on_request" && (
          <div
            className="card mb-6"
            style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}
          >
            <div className="text-sm" style={{ color: "#C2410C" }}>
              🔔 <strong>{t("On-Request certificate")}</strong> —{" "}
              {t(
                "professionals see your public summary and must request full access. You'll be notified and can approve or deny each request from your dashboard.",
              )}
            </div>
          </div>
        )}

        <fieldset className="fieldset">
          <legend>{t("Lettre de motivation")}</legend>
          <div className="form-group mb-0">
            <label htmlFor="motivation_letter">
              {t("Your cover letter")}{" "}
              <span className="text-gray-400 font-normal">({t("optional")})</span>
            </label>
            <textarea
              id="motivation_letter"
              rows={5}
              placeholder={t(
                "Introduce yourself and explain why you'd be a great tenant for this property…",
              )}
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              style={{ resize: "vertical" }}
            />
            <div className="form-hint">
              {t("Only visible to the recipient once they unlock your certificate.")}
            </div>
          </div>
        </fieldset>

        <div className="flex gap-4">
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={submitting || submitDisabled}
            style={submitDisabled ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
          >
            {submitting ? t("Generating…") : t("Generate QR certificate")}
          </button>
          <Link href="/tenant/certificates" className="btn btn-ghost">
            {t("Cancel")}
          </Link>
        </div>

        {loaded && !tenant && (
          <div
            className="mt-3 rounded-[2px] p-4 text-sm"
            style={{
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              color: "var(--red)",
            }}
          >
            <strong>{t("Profile not completed.")}</strong>{" "}
            <Link
              href="/tenant/profile"
              className="font-semibold underline"
              style={{ color: "var(--red)" }}
            >
              {t("Fill in your profile →")}
            </Link>
          </div>
        )}

        {validity && !validity.valid && (
          <div
            className="mt-3 rounded-[2px] p-4 text-sm"
            style={{
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              color: "var(--red)",
            }}
          >
            <strong>{t("Cannot generate certificate yet.")}</strong>{" "}
            {t("Please resolve the following:")}
            <ul style={{ margin: "8px 0 0 16px", padding: 0, listStyleType: "disc" }}>
              {validity.reasons.map((r, i) => (
                <li key={i}>{t(r)}</li>
              ))}
            </ul>
            <div className="mt-2">
              <Link
                href="/tenant/profile"
                className="font-semibold underline"
                style={{ color: "var(--red)" }}
              >
                {t("Complete profile →")}
              </Link>
              &nbsp;{" "}
              <Link
                href="/tenant/documents"
                className="font-semibold underline"
                style={{ color: "var(--red)" }}
              >
                {t("Upload documents →")}
              </Link>
            </div>
          </div>
        )}
      </form>
    </>
  );
}

function ModeCard({
  selected,
  onClick,
  icon,
  title,
  desc,
  badge,
  badgeColor,
}: {
  selected: boolean;
  onClick: () => void;
  icon: string;
  title: string;
  desc: string;
  badge: string;
  badgeColor: string;
}) {
  return (
    <label
      onClick={onClick}
      className="flex flex-col gap-1.5 p-4 cursor-pointer rounded-[2px] transition-colors"
      style={{
        border: `2px solid ${selected ? "var(--charcoal)" : "var(--gray-200)"}`,
        background: selected ? "var(--gray-100)" : "white",
      }}
    >
      <div className="text-2xl">{icon}</div>
      <div className="font-bold text-[0.95rem]">{title}</div>
      <div className="text-[0.78rem] text-gray-500 leading-snug">{desc}</div>
      <div className="text-[0.72rem] font-semibold mt-1" style={{ color: badgeColor }}>
        {badge}
      </div>
    </label>
  );
}

function DirectedTypeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 text-sm font-semibold rounded-[2px] transition-colors"
      style={{
        border: `1.5px solid ${active ? "var(--charcoal)" : "var(--gray-200)"}`,
        color: active ? "var(--charcoal)" : "var(--gray-500)",
        background: active ? "var(--gray-100)" : "white",
      }}
    >
      {children}
    </button>
  );
}
