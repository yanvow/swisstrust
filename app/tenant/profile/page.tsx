"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useTenant } from "../_components/TenantContext";
import { useT } from "@/lib/i18n";
import {
  JURIDICAL_FORMS,
  NATIONALITIES,
  PERMIT_TYPES,
  WELFARE_ORGS,
} from "@/lib/profile-constants";

type Profile = Record<string, unknown>;

const PERSON_PREFIXES = ["guarantor", "co_tenant", "roommate"] as const;
type PersonPrefix = (typeof PERSON_PREFIXES)[number];

export default function TenantProfilePage() {
  const t = useT();
  const { userId } = useTenant();
  const [profile, setProfile] = useState<Profile>({});
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [prevNationality, setPrevNationality] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const isLocked = !!profile.is_gov_info_locked;
  const guarantorLocked = !!profile.guarantor_is_gov_info_locked;

  useEffect(() => {
    const sb = createClient();
    (async () => {
      const { data } = await sb.from("tenants").select("*").eq("user_id", userId).maybeSingle();
      if (data) {
        setProfile(data as Profile);
        setTenantId((data as { id: string }).id);
        setPrevNationality((data as { nationality?: string | null }).nationality || null);
      }
      setLoaded(true);
    })();
  }, [userId]);

  function set(field: string, value: unknown) {
    setProfile((p) => ({ ...p, [field]: value }));
  }

  function getStr(field: string): string {
    const v = profile[field];
    return v == null ? "" : String(v);
  }
  function getBool(field: string): boolean {
    return !!profile[field];
  }

  function toggleRentalType(prefix: PersonPrefix) {
    const key = `needs_${prefix === "co_tenant" ? "co_tenant" : prefix}`;
    const next = !getBool(key);
    const updates: Profile = { [key]: next };
    if (next) {
      for (const p of PERSON_PREFIXES) {
        if (p !== prefix) {
          updates[`needs_${p === "co_tenant" ? "co_tenant" : p}`] = false;
        }
      }
    }
    setProfile((p) => ({ ...p, ...updates }));
  }

  function toggleIncomeType(field: string) {
    const cur = !!profile[field];
    const next = !cur;
    const working = ["is_employee", "is_self_employed"];
    const benefits = ["is_unemployed", "is_on_welfare"];
    const updates: Profile = { [field]: next };
    if (field === "is_no_income" && next) {
      [...working, ...benefits].forEach((k) => (updates[k] = false));
    } else if (next) {
      updates["is_no_income"] = false;
      if (working.includes(field)) benefits.forEach((k) => (updates[k] = false));
      else if (benefits.includes(field)) {
        working.forEach((k) => (updates[k] = false));
        benefits.forEach((k) => {
          if (k !== field) updates[k] = false;
        });
      }
    }
    setProfile((p) => ({ ...p, ...updates }));
  }

  async function requestReview(isGuarantor: boolean) {
    const note = prompt(
      isGuarantor
        ? t(
            "Please describe the change needed for your guarantor's information (e.g. name change, error in document):\n\nYour certificate cannot be generated until an admin reviews and approves the change.",
          )
        : t(
            "Please describe the change you need (e.g. name change after marriage, error in document):\n\nYour certificate cannot be generated until an admin reviews and approves the change.",
          ),
    );
    if (!note || !note.trim()) return;
    const sb = createClient();
    const fields = isGuarantor
      ? {
          guarantor_gov_info_review_requested: true,
          guarantor_gov_info_review_note: note.trim(),
        }
      : { gov_info_review_requested: true, gov_info_review_note: note.trim() };
    const { error } = await sb.from("tenants").update(fields).eq("id", tenantId);
    if (error) {
      alert(t("Failed to submit review request") + ": " + error.message);
      return;
    }
    setProfile((p) => ({ ...p, ...fields }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError(null);
    setSaving(true);
    const sb = createClient();
    const occCount = (toInt(profile.adult_count, 1) || 1) + (toInt(profile.children_count, 0) || 0);
    const fields: Profile = {
      ...(isLocked
        ? {}
        : {
            full_name: getStr("full_name").trim(),
            date_of_birth: getStr("date_of_birth") || null,
          }),
      nationality: getStr("nationality").trim() || null,
      permit_type:
        getStr("nationality") === "Swiss" ? "swiss" : getStr("permit_type") || null,
      current_address: getStr("current_address").trim() || null,
      is_employee: getBool("is_employee"),
      is_self_employed: getBool("is_self_employed"),
      is_unemployed: getBool("is_unemployed"),
      is_on_welfare: getBool("is_on_welfare"),
      is_no_income: getBool("is_no_income"),
      employer_name: getStr("employer_name").trim() || null,
      job_role: getStr("job_role").trim() || null,
      employment_start_date: getStr("employment_start_date") || null,
      monthly_gross_salary: toFloat(profile.monthly_gross_salary),
      business_name: getStr("business_name").trim() || null,
      business_activity: getStr("business_activity").trim() || null,
      juridical_form: getStr("juridical_form") || null,
      business_start_date: getStr("business_start_date") || null,
      annual_net_income: toFloat(profile.annual_net_income),
      previous_employer_name: getStr("previous_employer_name").trim() || null,
      previous_job_role: getStr("previous_job_role").trim() || null,
      previous_employment_end_date: getStr("previous_employment_end_date") || null,
      unemployment_benefit_start_date: getStr("unemployment_benefit_start_date") || null,
      unemployment_benefit_amount: toFloat(profile.unemployment_benefit_amount),
      welfare_organisation: getStr("welfare_organisation") || null,
      adult_count: toInt(profile.adult_count, 1),
      children_count: toInt(profile.children_count, 0),
      occupant_count: occCount,
      is_smoker: getBool("is_smoker"),
      has_pets: getBool("has_pets"),
      pet_types: getBool("has_pets") ? getStr("pet_types").trim() || null : null,
      plays_instrument: getBool("plays_instrument"),
      instrument_types: getBool("plays_instrument")
        ? getStr("instrument_types").trim() || null
        : null,
      has_vehicle: getBool("has_vehicle"),
      vehicle_types: getBool("has_vehicle") ? getStr("vehicle_types").trim() || null : null,
      needs_guarantor: getBool("needs_guarantor"),
      needs_co_tenant: getBool("needs_co_tenant"),
      needs_roommate: getBool("needs_roommate"),
      has_household_liability_insurance: getBool("has_household_liability_insurance"),
      rental_deposit_type: getStr("rental_deposit_type") || null,
      profile_complete: true,
      updated_at: new Date().toISOString(),
    };

    for (const prefix of PERSON_PREFIXES) {
      const isGuarantorPrefix = prefix === "guarantor";
      const lockedPrefix = isGuarantorPrefix && guarantorLocked;
      if (!lockedPrefix) {
        fields[`${prefix}_full_name`] = getStr(`${prefix}_full_name`).trim() || null;
        fields[`${prefix}_date_of_birth`] = getStr(`${prefix}_date_of_birth`) || null;
      }
      fields[`${prefix}_nationality`] = getStr(`${prefix}_nationality`) || null;
      fields[`${prefix}_permit_type`] =
        getStr(`${prefix}_nationality`) === "Swiss"
          ? "swiss"
          : getStr(`${prefix}_permit_type`) || null;
      fields[`${prefix}_current_address`] = getStr(`${prefix}_current_address`).trim() || null;
      fields[`${prefix}_is_employee`] = getBool(`${prefix}_is_employee`);
      fields[`${prefix}_is_self_employed`] = getBool(`${prefix}_is_self_employed`);
      fields[`${prefix}_employer_name`] = getStr(`${prefix}_employer_name`).trim() || null;
      fields[`${prefix}_job_role`] = getStr(`${prefix}_job_role`).trim() || null;
      fields[`${prefix}_employment_start_date`] =
        getStr(`${prefix}_employment_start_date`) || null;
      fields[`${prefix}_monthly_gross_salary`] = toFloat(profile[`${prefix}_monthly_gross_salary`]);
      fields[`${prefix}_business_name`] = getStr(`${prefix}_business_name`).trim() || null;
      fields[`${prefix}_business_activity`] = getStr(`${prefix}_business_activity`).trim() || null;
      fields[`${prefix}_juridical_form`] = getStr(`${prefix}_juridical_form`) || null;
      fields[`${prefix}_business_start_date`] = getStr(`${prefix}_business_start_date`) || null;
      fields[`${prefix}_annual_net_income`] = toFloat(profile[`${prefix}_annual_net_income`]);
    }

    const { error } = await sb.from("tenants").upsert({ user_id: userId, ...fields });
    setSaving(false);
    if (error) {
      setSaveError(error.message);
      return;
    }

    if (tenantId && prevNationality !== fields.nationality) {
      const wasSwiss = prevNationality === "Swiss";
      const nowSwiss = fields.nationality === "Swiss";
      if (wasSwiss !== nowSwiss) {
        const toRemove = ["passport_id"];
        if (!wasSwiss && nowSwiss) toRemove.push("residence_permit");
        const { data: docs } = await sb
          .from("documents")
          .select("id, storage_path, doc_type")
          .eq("tenant_id", tenantId);
        for (const d of ((docs as { id: string; storage_path: string; doc_type: string }[]) ||
          [])) {
          if (toRemove.includes(d.doc_type)) {
            if (d.storage_path) await sb.storage.from("documents").remove([d.storage_path]);
            await sb.from("documents").delete().eq("id", d.id);
          }
        }
      }
    }
    setPrevNationality((fields.nationality as string) || null);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  }

  if (!loaded) {
    return <div className="text-sm text-gray-400">{t("Loading…")}</div>;
  }

  const isSwiss = getStr("nationality") === "Swiss";

  const totalOccupants = (toInt(profile.adult_count, 1) || 1) + (toInt(profile.children_count, 0) || 0);

  return (
    <>
      <h1 className="text-2xl font-bold">{t("My profile")}</h1>
      <p className="text-gray-400 text-sm mt-1 mb-6">
        {t("This information is verified and used across all your certificates.")}
      </p>

      <div className="alert alert-info mb-6">
        <span>ℹ️</span>
        <span>
          {t(
            "Your profile data is fixed — it won't change between certificates. Only property-specific details vary per certificate.",
          )}
        </span>
      </div>

      <form onSubmit={handleSubmit}>
        <fieldset className="fieldset">
          <legend>{t("Personal information")}</legend>
          {isLocked && (
            <LockBanner
              kind="self"
              reviewRequested={getBool("gov_info_review_requested")}
              onRequest={() => requestReview(false)}
            />
          )}
          <div className="form-row">
            <div className="form-group">
              <label>
                {t("Full government name")} <span className="req">*</span>{" "}
                {isLocked && <span style={{ color: "var(--amber)" }}>🔒</span>}
              </label>
              <input
                type="text"
                placeholder={t("Exact name as on your passport or ID card")}
                required
                readOnly={isLocked}
                style={isLocked ? { background: "var(--gray-100)" } : undefined}
                value={getStr("full_name")}
                onChange={(e) => set("full_name", e.target.value)}
              />
              <div className="form-hint">{t("Must match your identity documents exactly.")}</div>
            </div>
            <div className="form-group">
              <label>
                {t("Date of birth")} <span className="req">*</span>{" "}
                {isLocked && <span style={{ color: "var(--amber)" }}>🔒</span>}
              </label>
              <input
                type="date"
                required
                readOnly={isLocked}
                style={isLocked ? { background: "var(--gray-100)" } : undefined}
                value={getStr("date_of_birth")}
                onChange={(e) => set("date_of_birth", e.target.value)}
              />
            </div>
          </div>
          <div className="form-row">
            <NationalitySelect
              value={getStr("nationality")}
              onChange={(v) => {
                set("nationality", v);
                if (v === "Swiss") set("permit_type", "swiss");
                else if (getStr("permit_type") === "swiss") set("permit_type", "");
              }}
              required
            />
            <PermitSelect
              value={getStr("permit_type")}
              onChange={(v) => set("permit_type", v)}
              isSwiss={isSwiss}
              required
            />
          </div>
          <div className="form-group">
            <label>
              {t("Current address")} <span className="req">*</span>
            </label>
            <input
              type="text"
              placeholder={t("Street, city, postcode, country")}
              required
              value={getStr("current_address")}
              onChange={(e) => set("current_address", e.target.value)}
            />
          </div>
        </fieldset>

        <fieldset className="fieldset">
          <legend>{t("Type of income")}</legend>
          <div className="text-xs text-gray-400 mb-3">
            {t(
              "Select all that apply — this determines which financial documents you'll need to upload.",
            )}
          </div>
          <div className="flex flex-col gap-3">
            <IncomeOption
              label={t("Employee")}
              desc={t(
                "You receive a salary from an employer — you will need to provide 3 months of salary slips.",
              )}
              checked={getBool("is_employee")}
              onChange={() => toggleIncomeType("is_employee")}
            />
            <IncomeOption
              label={t("Self-employed / Independent")}
              desc={t(
                "You run your own business or work as a freelancer — you will need to provide balance sheets, tax assessments, bank statements, and proof of self-employed status.",
              )}
              checked={getBool("is_self_employed")}
              onChange={() => toggleIncomeType("is_self_employed")}
            />
            <IncomeOption
              label={t("Unemployed (receiving unemployment benefits)")}
              desc={t(
                "You are currently receiving unemployment benefits (indemnités chômage / Arbeitslosengeld) — you will need to provide 3 months of benefit statements.",
              )}
              checked={getBool("is_unemployed")}
              onChange={() => toggleIncomeType("is_unemployed")}
            />
            <IncomeOption
              label={t("Social assistance / Welfare")}
              desc={t(
                "You are supported by a social assistance organisation — you will need to provide a certificate of rent coverage.",
              )}
              checked={getBool("is_on_welfare")}
              onChange={() => toggleIncomeType("is_on_welfare")}
            />
            <IncomeOption
              label={t("No income")}
              desc={t("You currently have no income of any kind.")}
              checked={getBool("is_no_income")}
              onChange={() => toggleIncomeType("is_no_income")}
            />
          </div>
        </fieldset>

        {getBool("is_employee") && (
          <fieldset className="fieldset">
            <legend>{t("Employment")}</legend>
            <EmploymentFields prefix="" profile={profile} set={set} />
          </fieldset>
        )}

        {getBool("is_self_employed") && (
          <fieldset className="fieldset">
            <legend>{t("Self-employment")}</legend>
            <SelfEmploymentFields prefix="" profile={profile} set={set} />
          </fieldset>
        )}

        {getBool("is_unemployed") && (
          <fieldset className="fieldset">
            <legend>{t("Previous employment")}</legend>
            <div className="form-row">
              <Field
                label={t("Last employer name")}
                value={getStr("previous_employer_name")}
                onChange={(v) => set("previous_employer_name", v)}
                placeholder={t("Company name")}
              />
              <Field
                label={t("Last job title")}
                value={getStr("previous_job_role")}
                onChange={(v) => set("previous_job_role", v)}
                placeholder={t("Your position")}
              />
            </div>
            <div className="form-group">
              <label>{t("Employment end date")}</label>
              <input
                type="date"
                style={{ maxWidth: 240 }}
                value={getStr("previous_employment_end_date")}
                onChange={(e) => set("previous_employment_end_date", e.target.value)}
              />
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-[0.875rem] font-semibold mb-3">
                {t("Unemployment benefits")}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t("Benefit start date")}</label>
                  <input
                    type="date"
                    value={getStr("unemployment_benefit_start_date")}
                    onChange={(e) => set("unemployment_benefit_start_date", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>{t("Monthly benefit amount (CHF)")}</label>
                  <input
                    type="number"
                    placeholder="4200"
                    value={getStr("unemployment_benefit_amount")}
                    onChange={(e) => set("unemployment_benefit_amount", e.target.value)}
                  />
                </div>
              </div>
            </div>
          </fieldset>
        )}

        {getBool("is_on_welfare") && (
          <fieldset className="fieldset">
            <legend>{t("Social assistance / Welfare")}</legend>
            <div className="form-group">
              <label>{t("Social assistance organisation")}</label>
              <select
                value={getStr("welfare_organisation")}
                onChange={(e) => set("welfare_organisation", e.target.value)}
              >
                <option value="">— {t("Select organisation")}</option>
                {WELFARE_ORGS.map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    {g.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </fieldset>
        )}

        <fieldset className="fieldset">
          <legend>{t("Household")}</legend>
          <div className="form-group">
            <label>
              {t("Number of occupants (including yourself)")} <span className="req">*</span>
            </label>
            <div className="flex gap-4 flex-wrap items-end">
              <div>
                <div className="text-xs text-gray-400 mb-1">{t("Adults")}</div>
                <input
                  type="number"
                  min={1}
                  max={20}
                  style={{ maxWidth: 100 }}
                  value={getStr("adult_count") || "1"}
                  onChange={(e) => set("adult_count", e.target.value)}
                />
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">{t("Children")}</div>
                <input
                  type="number"
                  min={0}
                  max={20}
                  style={{ maxWidth: 100 }}
                  value={getStr("children_count") || "0"}
                  onChange={(e) => set("children_count", e.target.value)}
                />
              </div>
              <div className="pb-1 text-gray-400 text-[0.85rem]">
                {t("Total")}: <strong>{totalOccupants}</strong>
              </div>
            </div>
          </div>
          <ToggleRow
            title={t("Smoker")}
            desc={t("Does any occupant smoke?")}
            checked={getBool("is_smoker")}
            onChange={(v) => set("is_smoker", v)}
          />
          <ToggleRow
            title={t("Pets")}
            desc={t("Do you have or plan to have pets?")}
            checked={getBool("has_pets")}
            onChange={(v) => set("has_pets", v)}
          />
          {getBool("has_pets") && (
            <div className="py-2.5">
              <label className="text-[0.875rem] text-gray-500">{t("Which pets?")}</label>
              <input
                type="text"
                placeholder={t("e.g. dog, cat")}
                style={{ marginTop: 6, width: "100%" }}
                value={getStr("pet_types")}
                onChange={(e) => set("pet_types", e.target.value)}
              />
            </div>
          )}
          <ToggleRow
            title={t("Plays an instrument")}
            desc={t("Do you or any occupant play a musical instrument?")}
            checked={getBool("plays_instrument")}
            onChange={(v) => set("plays_instrument", v)}
          />
          {getBool("plays_instrument") && (
            <div className="py-2.5">
              <label className="text-[0.875rem] text-gray-500">{t("Which instrument(s)?")}</label>
              <input
                type="text"
                placeholder={t("e.g. piano, guitar")}
                style={{ marginTop: 6, width: "100%" }}
                value={getStr("instrument_types")}
                onChange={(e) => set("instrument_types", e.target.value)}
              />
            </div>
          )}
          <ToggleRow
            title={t("Vehicle")}
            desc={t("Do you own or regularly use a vehicle?")}
            checked={getBool("has_vehicle")}
            onChange={(v) => set("has_vehicle", v)}
          />
          {getBool("has_vehicle") && (
            <div className="py-2.5">
              <label className="text-[0.875rem] text-gray-500">{t("What type?")}</label>
              <input
                type="text"
                placeholder={t("e.g. car, motorcycle, van")}
                style={{ marginTop: 6, width: "100%" }}
                value={getStr("vehicle_types")}
                onChange={(e) => set("vehicle_types", e.target.value)}
              />
            </div>
          )}
        </fieldset>

        <fieldset className="fieldset">
          <legend>{t("Rental situation")}</legend>
          <div className="text-[0.875rem] text-gray-500 mb-2.5">
            {t("Will anyone else be renting with you or providing support?")}
          </div>
          <div className="flex flex-col gap-2.5">
            <ToggleRow
              title={t("Guarantor")}
              desc={t("A third party will co-sign or provide financial guarantee on your behalf")}
              checked={getBool("needs_guarantor")}
              onChange={() => toggleRentalType("guarantor")}
            />
            <ToggleRow
              title={t("Co-tenant")}
              desc={t(
                "Another person will be named on the lease and share full responsibility",
              )}
              checked={getBool("needs_co_tenant")}
              onChange={() => toggleRentalType("co_tenant")}
            />
            <ToggleRow
              title={t("Roommate")}
              desc={t("Someone will live with you but is not on the lease")}
              checked={getBool("needs_roommate")}
              onChange={() => toggleRentalType("roommate")}
            />
          </div>

          {getBool("needs_guarantor") && (
            <PersonSection
              prefix="guarantor"
              profile={profile}
              set={set}
              setProfile={setProfile}
              isLocked={guarantorLocked}
              reviewRequested={getBool("guarantor_gov_info_review_requested")}
              onRequestReview={() => requestReview(true)}
            />
          )}
          {getBool("needs_co_tenant") && (
            <PersonSection prefix="co_tenant" profile={profile} set={set} setProfile={setProfile} />
          )}
          {getBool("needs_roommate") && (
            <PersonSection prefix="roommate" profile={profile} set={set} setProfile={setProfile} />
          )}

          <div
            className="toggle-row"
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: "1px solid var(--gray-200)",
            }}
          >
            <div>
              <div className="text-[0.9rem] font-medium">
                {t("Household liability insurance")}{" "}
                <span className="text-xs text-gray-400 font-normal">({t("optional")})</span>
              </div>
              <div className="text-xs text-gray-400">
                {t(
                  "I have or plan to take out household liability insurance (RC ménage / Privathaftpflicht)",
                )}
              </div>
            </div>
            <label className="toggle">
              <input
                type="checkbox"
                checked={getBool("has_household_liability_insurance")}
                onChange={(e) => set("has_household_liability_insurance", e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="form-group mt-4">
            <label>
              {t("Rental deposit method")}{" "}
              <span className="text-xs text-gray-400 font-normal">({t("optional")})</span>
            </label>
            <select
              value={getStr("rental_deposit_type")}
              onChange={(e) => set("rental_deposit_type", e.target.value)}
            >
              <option value="">— {t("Not specified")}</option>
              <option value="bank_guarantee">{t("Bank guarantee (blocking account)")}</option>
              <option value="cash_deposit">{t("Cash deposit")}</option>
              <option value="insurance_guarantee">
                {t("Insurance guarantee (e.g. SwissCaution, firstcaution)")}
              </option>
              <option value="cooperative_share">{t("Cooperative share / membership")}</option>
              <option value="other">{t("Other")}</option>
            </select>
            <div className="form-hint">
              {t("How you plan to provide the security deposit (caution)")}
            </div>
          </div>
        </fieldset>

        {saveError && <div className="text-red text-sm mb-3">{saveError}</div>}

        <div className="flex gap-4">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
            style={justSaved ? { background: "var(--green)" } : undefined}
          >
            {justSaved
              ? `✓ ${t("Saved")}`
              : saving
                ? t("Saving…")
                : t("Save profile")}
          </button>
          <Link href="/tenant/documents" className="btn btn-outline">
            {t("Next: Upload documents →")}
          </Link>
        </div>
      </form>
    </>
  );
}

function LockBanner({
  kind,
  reviewRequested,
  onRequest,
}: {
  kind: "self" | "guarantor";
  reviewRequested: boolean;
  onRequest: () => void;
}) {
  const t = useT();
  return (
    <div
      style={{
        background: "#FEF3C7",
        border: "1px solid #FCD34D",
        borderRadius: "var(--radius)",
        padding: "12px 14px",
        marginBottom: 16,
        fontSize: ".875rem",
      }}
    >
      <div className="flex items-start gap-2">
        <span>🔒</span>
        <div className="flex-1">
          <strong>
            {kind === "self" ? t("Government identity locked") : t("Guarantor identity locked")}
          </strong>{" "}
          —{" "}
          {kind === "self"
            ? t(
                "Your full name and date of birth have been verified against your identity document and are now read-only.",
              )
            : t(
                "The guarantor's name and date of birth have been verified and are now read-only.",
              )}
          {reviewRequested && (
            <>
              <br />
              <span style={{ color: "var(--amber)", fontWeight: 600 }}>
                {t("Review request pending — an admin will process your request.")}
              </span>
            </>
          )}
          <div className="mt-2">
            <button
              type="button"
              onClick={onRequest}
              className="btn btn-sm btn-outline"
              disabled={reviewRequested}
            >
              {reviewRequested ? t("Review requested") : t("Request a change")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function NationalitySelect({
  value,
  onChange,
  required,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  label?: string;
}) {
  const t = useT();
  return (
    <div className="form-group">
      <label>
        {label || t("Nationality")} {required && <span className="req">*</span>}
      </label>
      <select required={required} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— {t("Select nationality")}</option>
        {NATIONALITIES.map((g) => (
          <optgroup key={g.group} label={g.group}>
            {g.options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

function PermitSelect({
  value,
  onChange,
  isSwiss,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  isSwiss: boolean;
  required?: boolean;
}) {
  const t = useT();
  return (
    <div className="form-group">
      <label>
        {t("Permit type")} {required && <span className="req">*</span>}
      </label>
      <select
        required={required}
        value={value}
        disabled={isSwiss}
        onChange={(e) => onChange(e.target.value)}
      >
        {!isSwiss && <option value="">—</option>}
        {PERMIT_TYPES.map((p) => (
          <option key={p.value} value={p.value} hidden={!isSwiss && p.value === "swiss"}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function PersonSection({
  prefix,
  profile,
  set,
  setProfile,
  isLocked,
  reviewRequested,
  onRequestReview,
}: {
  prefix: PersonPrefix;
  profile: Profile;
  set: (f: string, v: unknown) => void;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
  isLocked?: boolean;
  reviewRequested?: boolean;
  onRequestReview?: () => void;
}) {
  const t = useT();
  const getStr = (f: string) => (profile[`${prefix}_${f}`] == null ? "" : String(profile[`${prefix}_${f}`]));
  const getBool = (f: string) => !!profile[`${prefix}_${f}`];
  const setF = (f: string, v: unknown) => set(`${prefix}_${f}`, v);

  const niceName = prefix === "co_tenant" ? t("Co-tenant") : prefix === "roommate" ? t("Roommate") : t("Guarantor");
  const isSwiss = getStr("nationality") === "Swiss";

  return (
    <div style={{ marginTop: 16 }}>
      <div className="text-[0.9rem] font-semibold mb-3">
        {niceName} — {t("Personal information")}
      </div>
      {prefix === "guarantor" && isLocked && (
        <LockBanner
          kind="guarantor"
          reviewRequested={!!reviewRequested}
          onRequest={onRequestReview!}
        />
      )}
      <div className="form-row">
        <div className="form-group">
          <label>
            {t("Full government name")} {isLocked && <span style={{ color: "var(--amber)" }}>🔒</span>}
          </label>
          <input
            type="text"
            placeholder={t("Exact name as on passport or ID")}
            readOnly={isLocked}
            style={isLocked ? { background: "var(--gray-100)" } : undefined}
            value={getStr("full_name")}
            onChange={(e) => setF("full_name", e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>
            {t("Date of birth")} {isLocked && <span style={{ color: "var(--amber)" }}>🔒</span>}
          </label>
          <input
            type="date"
            readOnly={isLocked}
            style={isLocked ? { background: "var(--gray-100)" } : undefined}
            value={getStr("date_of_birth")}
            onChange={(e) => setF("date_of_birth", e.target.value)}
          />
        </div>
      </div>
      <div className="form-row">
        <NationalitySelect
          value={getStr("nationality")}
          onChange={(v) => {
            setF("nationality", v);
            if (v === "Swiss") setF("permit_type", "swiss");
            else if (getStr("permit_type") === "swiss") setF("permit_type", "");
          }}
        />
        <PermitSelect
          value={getStr("permit_type")}
          onChange={(v) => setF("permit_type", v)}
          isSwiss={isSwiss}
        />
      </div>
      <div className="form-group">
        <label>{t("Current address")}</label>
        <input
          type="text"
          placeholder={t("Street, city, postcode, country")}
          value={getStr("current_address")}
          onChange={(e) => setF("current_address", e.target.value)}
        />
      </div>

      <div className="mt-5 pt-4 border-t border-gray-200">
        <div className="text-[0.9rem] font-semibold mb-1">
          {niceName === t("Guarantor")
            ? t("Guarantor's income type")
            : niceName === t("Co-tenant")
              ? t("Co-tenant's income type")
              : t("Roommate's income type")}
        </div>
        <div className="text-xs text-gray-400 mb-3">
          {t(
            "Select all that apply — this determines which financial documents the person will need to provide.",
          )}
        </div>
        <div className="flex flex-col gap-3">
          <IncomeOption
            label={t("Employee")}
            desc={t(
              "Employed — will need to provide 3 months of salary slips.",
            )}
            checked={getBool("is_employee")}
            onChange={() =>
              setProfile((p) => ({
                ...p,
                [`${prefix}_is_employee`]: !p[`${prefix}_is_employee`],
              }))
            }
          />
          <IncomeOption
            label={t("Self-employed / Independent")}
            desc={t(
              "Runs their own business — will provide balance sheets, tax assessments, bank statements, and proof of income.",
            )}
            checked={getBool("is_self_employed")}
            onChange={() =>
              setProfile((p) => ({
                ...p,
                [`${prefix}_is_self_employed`]: !p[`${prefix}_is_self_employed`],
              }))
            }
          />
        </div>
      </div>

      {getBool("is_employee") && (
        <div className="mt-5 pt-4 border-t border-gray-200">
          <div className="text-[0.9rem] font-semibold mb-3">{niceName} — {t("Employment")}</div>
          <EmploymentFields prefix={`${prefix}_`} profile={profile} set={set} />
        </div>
      )}
      {getBool("is_self_employed") && (
        <div className="mt-5 pt-4 border-t border-gray-200">
          <div className="text-[0.9rem] font-semibold mb-3">{niceName} — {t("Self-employment")}</div>
          <SelfEmploymentFields prefix={`${prefix}_`} profile={profile} set={set} />
        </div>
      )}
    </div>
  );
}

function EmploymentFields({
  prefix,
  profile,
  set,
}: {
  prefix: string;
  profile: Profile;
  set: (f: string, v: unknown) => void;
}) {
  const t = useT();
  const getStr = (f: string) => (profile[`${prefix}${f}`] == null ? "" : String(profile[`${prefix}${f}`]));
  return (
    <>
      <div className="form-row">
        <Field
          label={t("Employer name")}
          value={getStr("employer_name")}
          onChange={(v) => set(`${prefix}employer_name`, v)}
          placeholder={t("Company name")}
        />
        <Field
          label={t("Job title / role")}
          value={getStr("job_role")}
          onChange={(v) => set(`${prefix}job_role`, v)}
          placeholder={t("Your position")}
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>{t("Employment start date")}</label>
          <input
            type="date"
            value={getStr("employment_start_date")}
            onChange={(e) => set(`${prefix}employment_start_date`, e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>{t("Monthly gross salary (CHF)")}</label>
          <input
            type="number"
            placeholder="8500"
            value={getStr("monthly_gross_salary")}
            onChange={(e) => set(`${prefix}monthly_gross_salary`, e.target.value)}
          />
          {!prefix && (
            <div className="form-hint">
              {t("Used to calculate rent eligibility (salary ≥ 3× rent)")}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function SelfEmploymentFields({
  prefix,
  profile,
  set,
}: {
  prefix: string;
  profile: Profile;
  set: (f: string, v: unknown) => void;
}) {
  const t = useT();
  const getStr = (f: string) => (profile[`${prefix}${f}`] == null ? "" : String(profile[`${prefix}${f}`]));
  return (
    <>
      <div className="form-row">
        <Field
          label={t("Business name")}
          value={getStr("business_name")}
          onChange={(v) => set(`${prefix}business_name`, v)}
          placeholder={t("Company or trading name")}
        />
        <Field
          label={t("Type of activity")}
          value={getStr("business_activity")}
          onChange={(v) => set(`${prefix}business_activity`, v)}
          placeholder={t("e.g. IT consulting, retail")}
        />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>{t("Juridical form")}</label>
          <select
            value={getStr("juridical_form")}
            onChange={(e) => set(`${prefix}juridical_form`, e.target.value)}
          >
            <option value="">— {t("Select form")}</option>
            {JURIDICAL_FORMS.map((j) => (
              <option key={j.value} value={j.value}>
                {j.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>{t("Business start date")}</label>
          <input
            type="date"
            value={getStr("business_start_date")}
            onChange={(e) => set(`${prefix}business_start_date`, e.target.value)}
          />
        </div>
      </div>
      <div className="form-group">
        <label>{t("Average annual net income (CHF)")}</label>
        <input
          type="number"
          placeholder="85000"
          value={getStr("annual_net_income")}
          onChange={(e) => set(`${prefix}annual_net_income`, e.target.value)}
        />
        <div className="form-hint">{t("Average over the last 2–3 years if available")}</div>
      </div>
    </>
  );
}

function IncomeOption({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0 }}
      />
      <div>
        <div className="text-[0.9rem] font-medium">{label}</div>
        <div className="text-xs text-gray-400">{desc}</div>
      </div>
    </label>
  );
}

function ToggleRow({
  title,
  desc,
  checked,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="toggle-row">
      <div>
        <div className="text-[0.9rem] font-medium">{title}</div>
        <div className="text-xs text-gray-400">{desc}</div>
      </div>
      <label className="toggle">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="toggle-slider"></span>
      </label>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function toFloat(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
}

function toInt(v: unknown, fallback: number): number {
  if (v == null || v === "") return fallback;
  const n = parseInt(String(v));
  return isNaN(n) ? fallback : n;
}
