"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useTenant } from "../_components/TenantContext";
import { useT } from "@/lib/i18n";

type Tab = "options" | "usage" | "payment";

type PaymentMethod = {
  id: string;
  method_type: "wire_transfer" | "credit_card" | "twint";
  is_default: boolean;
  account_holder?: string | null;
  iban?: string | null;
  bank_name?: string | null;
  bic?: string | null;
  card_brand?: string | null;
  cardholder_name?: string | null;
  card_last4?: string | null;
  card_expiry?: string | null;
  twint_phone?: string | null;
};

type BillingProfile = {
  full_name: string | null;
  email: string | null;
  address: string | null;
  phone_country_code: string | null;
  phone_number: string | null;
  tax_ids: string[] | null;
};

type Invoice = {
  id: string;
  invoice_number: string;
  description: string | null;
  amount_chf: number;
  status: "paid" | "pending" | "overdue" | string;
  issued_at: string;
};

const PHONE_COUNTRIES: { code: string; flag: string }[] = [
  { code: "+41", flag: "🇨🇭" },
  { code: "+33", flag: "🇫🇷" },
  { code: "+49", flag: "🇩🇪" },
  { code: "+39", flag: "🇮🇹" },
  { code: "+43", flag: "🇦🇹" },
  { code: "+32", flag: "🇧🇪" },
  { code: "+31", flag: "🇳🇱" },
  { code: "+34", flag: "🇪🇸" },
  { code: "+351", flag: "🇵🇹" },
  { code: "+44", flag: "🇬🇧" },
  { code: "+1", flag: "🇺🇸" },
  { code: "+55", flag: "🇧🇷" },
  { code: "+86", flag: "🇨🇳" },
  { code: "+91", flag: "🇮🇳" },
  { code: "+81", flag: "🇯🇵" },
  { code: "+82", flag: "🇰🇷" },
  { code: "+7", flag: "🇷🇺" },
  { code: "+90", flag: "🇹🇷" },
  { code: "+212", flag: "🇲🇦" },
  { code: "+213", flag: "🇩🇿" },
  { code: "+216", flag: "🇹🇳" },
  { code: "+234", flag: "🇳🇬" },
  { code: "+254", flag: "🇰🇪" },
];

export default function TenantSettingsPage() {
  const t = useT();
  const { userId, email } = useTenant();
  const [tab, setTab] = useState<Tab>("options");
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    const sb = createClient();
    (async () => {
      const { data } = await sb.from("tenants").select("id").eq("user_id", userId).maybeSingle();
      if (data) setTenantId(data.id);
    })();
  }, [userId]);

  return (
    <>
      <h1 className="text-2xl font-bold">{t("Settings")}</h1>
      <p className="text-gray-400 text-sm mt-1 mb-7">
        {t("Manage your account, payment methods, and billing.")}
      </p>

      <div className="flex border-b-2 border-gray-200 mb-7 -mb-[2px]">
        {(["options", "usage", "payment"] as Tab[]).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={[
              "px-5 py-2.5 text-sm font-semibold border-b-2 -mb-[2px] transition-colors",
              tab === key
                ? "text-charcoal border-charcoal"
                : "text-gray-400 border-transparent hover:text-charcoal",
            ].join(" ")}
          >
            {tab === key ? t(label(key)) : t(label(key))}
          </button>
        ))}
      </div>

      {tab === "options" && <OptionsTab tenantId={tenantId} userId={userId} email={email} />}
      {tab === "usage" && <UsageTab tenantId={tenantId} />}
      {tab === "payment" && <PaymentTab userId={userId} />}
    </>
  );
}

function label(tab: Tab): string {
  if (tab === "options") return "Options";
  if (tab === "usage") return "Usage";
  return "Payment";
}

// ─── Options ─────────────────────────────────────────────────

function OptionsTab({
  tenantId,
  userId,
  email,
}: {
  tenantId: string | null;
  userId: string;
  email: string;
}) {
  const t = useT();
  const [prefs, setPrefs] = useState({
    certViewed: true,
    accessRequest: true,
    weeklyDigest: false,
    productNews: false,
  });
  const [otherPrefs, setOtherPrefs] = useState({ language: "en", dateFormat: "dd.mm.yyyy" });
  const [newEmail, setNewEmail] = useState("");
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [emailOk, setEmailOk] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [pwOk, setPwOk] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const p = JSON.parse(localStorage.getItem(`checks:notifPrefs:${userId}`) || "{}");
    setPrefs({
      certViewed: p["cert-viewed"] ?? true,
      accessRequest: p["access-request"] ?? true,
      weeklyDigest: p["weekly-digest"] ?? false,
      productNews: p["product-news"] ?? false,
    });
    const o = JSON.parse(localStorage.getItem(`checks:otherPrefs:${userId}`) || "{}");
    setOtherPrefs({
      language: o.language || "en",
      dateFormat: o.dateFormat || "dd.mm.yyyy",
    });
  }, [userId]);

  function savePrefs(next: typeof prefs) {
    setPrefs(next);
    localStorage.setItem(
      `checks:notifPrefs:${userId}`,
      JSON.stringify({
        "cert-viewed": next.certViewed,
        "access-request": next.accessRequest,
        "weekly-digest": next.weeklyDigest,
        "product-news": next.productNews,
      }),
    );
  }

  function saveOtherPrefs(next: typeof otherPrefs) {
    setOtherPrefs(next);
    localStorage.setItem(`checks:otherPrefs:${userId}`, JSON.stringify(next));
  }

  async function confirmDeleteDocuments() {
    if (!tenantId) {
      alert(t("Your tenant profile has not been created yet."));
      return;
    }
    if (!confirm(t("Permanently delete all your uploaded documents? This cannot be undone."))) return;
    const sb = createClient();
    const { data: docs } = await sb
      .from("documents")
      .select("id, storage_path")
      .eq("tenant_id", tenantId);
    if (docs && docs.length) {
      const paths = (docs as { storage_path: string }[]).map((d) => d.storage_path).filter(Boolean);
      if (paths.length) await sb.storage.from("documents").remove(paths);
    }
    const { error } = await sb.from("documents").delete().eq("tenant_id", tenantId);
    if (error) {
      alert(t("Error") + ": " + error.message);
      return;
    }
    alert(t("All documents have been deleted."));
  }

  async function confirmClearInfo() {
    if (!tenantId) {
      alert(t("Your tenant profile has not been created yet."));
      return;
    }
    if (
      !confirm(
        t(
          "Clear all your profile information? Your documents will not be affected. This cannot be undone.",
        ),
      )
    )
      return;
    const sb = createClient();
    const { error } = await sb
      .from("tenants")
      .update({
        full_name: null,
        date_of_birth: null,
        nationality: null,
        current_address: null,
        employer_name: null,
        job_role: null,
        employment_start_date: null,
        monthly_gross_salary: null,
        occupant_count: 1,
        is_smoker: false,
        has_pets: false,
        needs_guarantor: false,
        guarantor_is_employee: false,
        guarantor_is_self_employed: false,
        is_employee: false,
        is_self_employed: false,
        is_unemployed: false,
        is_on_welfare: false,
        has_household_liability_insurance: false,
        rental_deposit_type: null,
        profile_complete: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tenantId);
    if (error) {
      alert(t("Error") + ": " + error.message);
      return;
    }
    alert(t("Profile information has been cleared."));
  }

  async function confirmDeleteAccount() {
    if (
      !confirm(
        t(
          "PERMANENTLY delete your Checks account?\n\nThis will remove all your documents, certificates, and data. You will be signed out immediately. This cannot be undone.",
        ),
      )
    )
      return;
    setDeleting(true);
    setDeleteErr(null);
    const sb = createClient();
    const { error } = await sb.functions.invoke("delete-account", { body: {} });
    if (error) {
      setDeleting(false);
      setDeleteErr(error.message || t("Could not delete account. Please contact support."));
      return;
    }
    await sb.auth.signOut();
    window.location.href = "/auth/login";
  }

  async function changeEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailErr(null);
    setEmailOk(null);
    setEmailLoading(true);
    const sb = createClient();
    const { error } = await sb.auth.updateUser({ email: newEmail });
    setEmailLoading(false);
    if (error) {
      setEmailErr(error.message);
      return;
    }
    setEmailOk(
      t(
        "A confirmation link has been sent to {email}. Click the link in that email to confirm the change.",
      ).replace("{email}", newEmail),
    );
    setNewEmail("");
  }

  async function sendPasswordReset() {
    setPwOk(null);
    setPwErr(null);
    setPwLoading(true);
    const sb = createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user?.email) {
      setPwLoading(false);
      setPwErr(t("Not authenticated"));
      return;
    }
    const redirectTo = window.location.origin + "/auth/reset-password";
    const { error } = await sb.auth.resetPasswordForEmail(user.email, { redirectTo });
    setPwLoading(false);
    if (error) {
      setPwErr(error.message);
      return;
    }
    setPwOk(
      t("A password reset link has been sent to {email}.").replace("{email}", user.email),
    );
  }

  return (
    <>
      <fieldset className="fieldset">
        <legend>{t("Data management")}</legend>
        <div className="flex flex-col gap-5">
          <Row
            title={t("Delete all documents")}
            desc={t(
              "Permanently removes all uploaded files (passport, salary slips, etc.) from your dossier. Your profile information is kept.",
            )}
            action={
              <button
                className="btn btn-outline btn-sm"
                style={{ color: "var(--amber)", borderColor: "var(--amber)" }}
                onClick={confirmDeleteDocuments}
              >
                {t("Delete all documents")}
              </button>
            }
          />
          <Divider />
          <Row
            title={t("Clear all profile information")}
            desc={t(
              "Resets your name, employment, household and rental situation fields to blank. Documents are not affected.",
            )}
            action={
              <button
                className="btn btn-outline btn-sm"
                style={{ color: "var(--amber)", borderColor: "var(--amber)" }}
                onClick={confirmClearInfo}
              >
                {t("Clear information")}
              </button>
            }
          />
        </div>
      </fieldset>

      <fieldset className="fieldset" style={{ marginTop: 24 }}>
        <legend>{t("Notifications")}</legend>
        <div className="flex flex-col gap-4">
          <Toggle
            title={t("Certificate viewed")}
            desc={t("Receive an email when a landlord or agency opens your certificate.")}
            checked={prefs.certViewed}
            onChange={(v) => savePrefs({ ...prefs, certViewed: v })}
          />
          <Toggle
            title={t("Access request decided")}
            desc={t(
              "Get notified when a landlord's full-dossier access request is approved or denied.",
            )}
            checked={prefs.accessRequest}
            onChange={(v) => savePrefs({ ...prefs, accessRequest: v })}
          />
          <Toggle
            title={t("Weekly digest")}
            desc={t("A weekly summary of your certificate activity and dossier views.")}
            checked={prefs.weeklyDigest}
            onChange={(v) => savePrefs({ ...prefs, weeklyDigest: v })}
          />
          <Toggle
            title={t("Product news")}
            desc={t("Occasional emails about new Checks features and updates.")}
            checked={prefs.productNews}
            onChange={(v) => savePrefs({ ...prefs, productNews: v })}
          />
        </div>
      </fieldset>

      <fieldset className="fieldset" style={{ marginTop: 24 }}>
        <legend>{t("Other")}</legend>
        <div className="form-row" style={{ marginBottom: 0 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>{t("Interface language")}</label>
            <select
              value={otherPrefs.language}
              onChange={(e) => saveOtherPrefs({ ...otherPrefs, language: e.target.value })}
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="it">Italiano</option>
            </select>
            <div className="form-hint">
              {t("Applies to this browser. Full translation coming soon.")}
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>{t("Date format")}</label>
            <select
              value={otherPrefs.dateFormat}
              onChange={(e) => saveOtherPrefs({ ...otherPrefs, dateFormat: e.target.value })}
            >
              <option value="dd.mm.yyyy">DD.MM.YYYY (Swiss)</option>
              <option value="dd/mm/yyyy">DD/MM/YYYY</option>
              <option value="mm/dd/yyyy">MM/DD/YYYY</option>
              <option value="yyyy-mm-dd">YYYY-MM-DD (ISO)</option>
            </select>
          </div>
        </div>
      </fieldset>

      <fieldset className="fieldset" style={{ marginTop: 24 }}>
        <legend>{t("Account")}</legend>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="font-semibold text-[0.9rem]">{t("Email address")}</div>
            <div className="text-sm text-gray-400 mt-1">{email}</div>
          </div>
        </div>

        <div className="mt-4 border-t border-gray-200 pt-4">
          <div className="font-semibold text-[0.9rem] mb-1">{t("Change email address")}</div>
          <div className="text-sm text-gray-400 mb-3">
            {t(
              "A confirmation link will be sent to your new address. Your current email stays active until you confirm.",
            )}
          </div>
          <form onSubmit={changeEmail} className="flex gap-2 flex-wrap items-start">
            <input
              type="email"
              placeholder={t("New email address")}
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <button type="submit" disabled={emailLoading} className="btn btn-outline btn-sm">
              {emailLoading ? t("Sending…") : t("Send confirmation")}
            </button>
          </form>
          {emailErr && <div className="text-red text-sm mt-2">{emailErr}</div>}
          {emailOk && (
            <div className="bg-[#F0FDF4] border border-[#86EFAC] rounded-[2px] px-3.5 py-2.5 text-sm text-[#15803D] mt-2">
              {emailOk}
            </div>
          )}
        </div>

        <div className="mt-4 border-t border-gray-200 pt-4">
          <div className="font-semibold text-[0.9rem] mb-1">{t("Change password")}</div>
          <div className="text-sm text-gray-400 mb-3">
            {t("We'll send a password reset link to your current email address.")}
          </div>
          <button onClick={sendPasswordReset} disabled={pwLoading} className="btn btn-outline btn-sm">
            {pwLoading ? t("Sending…") : t("Send reset link")}
          </button>
          {pwOk && (
            <div className="bg-[#F0FDF4] border border-[#86EFAC] rounded-[2px] px-3.5 py-2.5 text-sm text-[#15803D] mt-2">
              {pwOk}
            </div>
          )}
          {pwErr && <div className="text-red text-sm mt-2">{pwErr}</div>}
        </div>
      </fieldset>

      <fieldset
        className="fieldset"
        style={{ marginTop: 24, borderColor: "#FECACA" }}
      >
        <legend style={{ color: "var(--red)" }}>{t("Danger zone")}</legend>
        <Row
          title={t("Delete my account")}
          desc={t(
            "Permanently deletes your Checks account, all documents, certificates, and profile data. This action cannot be undone.",
          )}
          action={
            <button
              className="btn btn-outline btn-sm"
              style={{ color: "var(--red)", borderColor: "var(--red)" }}
              onClick={confirmDeleteAccount}
              disabled={deleting}
            >
              {deleting ? t("Deleting…") : t("Delete account")}
            </button>
          }
        />
        {deleteErr && <div className="text-red text-sm mt-3">{deleteErr}</div>}
      </fieldset>
    </>
  );
}

// ─── Usage ───────────────────────────────────────────────────

function UsageTab({ tenantId }: { tenantId: string | null }) {
  const t = useT();
  const [certCount, setCertCount] = useState<number | null>(null);
  const [docCount, setDocCount] = useState<number | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    const sb = createClient();
    (async () => {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const [certRes, tenantRes] = await Promise.all([
        sb
          .from("certificates")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .gte("created_at", monthStart),
        sb.from("tenants").select("total_doc_uploads").eq("id", tenantId).single(),
      ]);
      setCertCount(certRes.count ?? 0);
      setDocCount((tenantRes.data as { total_doc_uploads: number } | null)?.total_doc_uploads ?? 0);
    })();
  }, [tenantId]);

  return (
    <>
      <div className="flex items-center justify-between gap-4 px-5 py-4 bg-gray-100 rounded-[2px] mb-6 flex-wrap">
        <div>
          <div className="font-bold">
            {t("Free plan")}{" "}
            <span
              className="badge badge-gray align-middle ml-1.5"
              style={{ fontSize: ".75rem" }}
            >
              {t("Current")}
            </span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {t("3 certificates/month · Unlimited document uploads · Basic application tracking")}
          </div>
        </div>
        <button className="btn btn-primary btn-sm" disabled title={t("Coming soon")}>
          {t("Upgrade to Premium")}
        </button>
      </div>

      <fieldset className="fieldset">
        <legend>{t("Monthly usage")}</legend>
        {certCount === null ? (
          <div className="text-sm text-gray-400">{t("Loading…")}</div>
        ) : (
          <UsageBar
            label={t("Certificates issued")}
            used={certCount}
            limit={3}
            sub={t("Monthly allowance resets on the 1st of each month. Upgrade for unlimited.")}
          />
        )}
      </fieldset>

      <fieldset className="fieldset" style={{ marginTop: 20 }}>
        <legend>{t("Storage")}</legend>
        {docCount === null ? (
          <div className="text-sm text-gray-400">{t("Loading…")}</div>
        ) : (
          <UsageBar
            label={t("Documents uploaded")}
            used={docCount}
            unlimited
            sub={t("Document uploads are always unlimited on all plans.")}
          />
        )}
      </fieldset>
    </>
  );
}

function UsageBar({
  label,
  used,
  limit,
  sub,
  unlimited,
}: {
  label: string;
  used: number;
  limit?: number;
  sub?: string;
  unlimited?: boolean;
}) {
  const pct = unlimited || !limit ? 0 : Math.min(100, (used / limit) * 100);
  const fillClass = unlimited ? "" : pct >= 100 ? "bg-red" : pct >= 80 ? "bg-amber" : "bg-charcoal";
  const count = unlimited ? `${used} / ∞` : `${used} / ${limit}`;
  return (
    <div className="mb-5 last:mb-0">
      <div className="flex items-center gap-3">
        <div className="text-sm font-semibold min-w-[190px] flex-shrink-0">{label}</div>
        <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${unlimited ? "bg-gray-300" : fillClass}`}
            style={{ width: unlimited ? "0%" : `${pct}%` }}
          />
        </div>
        <div className="text-sm font-semibold w-16 text-right text-charcoal flex-shrink-0">
          {count}
        </div>
      </div>
      {sub && <div className="text-xs text-gray-400 mt-1 pl-[202px]">{sub}</div>}
    </div>
  );
}

// ─── Payment ─────────────────────────────────────────────────

function PaymentTab({ userId }: { userId: string }) {
  const t = useT();
  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [methodsErr, setMethodsErr] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [billing, setBilling] = useState<BillingProfile>({
    full_name: "",
    email: "",
    address: "",
    phone_country_code: "+41",
    phone_number: "",
    tax_ids: [],
  });
  const [billingErr, setBillingErr] = useState<string | null>(null);
  const [billingSaving, setBillingSaving] = useState(false);
  const [billingSavedAt, setBillingSavedAt] = useState<number | null>(null);
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [invoicesErr, setInvoicesErr] = useState<string | null>(null);

  useEffect(() => {
    reloadMethods();
    reloadBilling();
    reloadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reloadMethods() {
    const sb = createClient();
    const { data, error } = await sb
      .from("payment_methods")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setMethodsErr(error.message);
      return;
    }
    setMethods((data as PaymentMethod[]) || []);
  }

  async function reloadBilling() {
    const sb = createClient();
    const { data } = await sb
      .from("billing_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      setBilling({
        full_name: data.full_name || "",
        email: data.email || "",
        address: data.address || "",
        phone_country_code: data.phone_country_code || "+41",
        phone_number: data.phone_number || "",
        tax_ids: data.tax_ids || [],
      });
    }
  }

  async function reloadInvoices() {
    const sb = createClient();
    const { data, error } = await sb
      .from("invoices")
      .select("*")
      .order("issued_at", { ascending: false });
    if (error) {
      setInvoicesErr(error.message);
      return;
    }
    setInvoices((data as Invoice[]) || []);
  }

  async function makeDefault(id: string) {
    const sb = createClient();
    await sb.from("payment_methods").update({ is_default: false }).eq("user_id", userId);
    const { error } = await sb.from("payment_methods").update({ is_default: true }).eq("id", id);
    if (error) {
      alert(t("Error") + ": " + error.message);
      return;
    }
    reloadMethods();
  }

  async function removeMethod(id: string) {
    if (!confirm(t("Remove this payment method?"))) return;
    const sb = createClient();
    const { error } = await sb.from("payment_methods").delete().eq("id", id);
    if (error) {
      alert(t("Error") + ": " + error.message);
      return;
    }
    reloadMethods();
  }

  async function saveBilling(e: React.FormEvent) {
    e.preventDefault();
    setBillingErr(null);
    setBillingSaving(true);
    const sb = createClient();
    const { error } = await sb.from("billing_profiles").upsert(
      {
        user_id: userId,
        full_name: billing.full_name?.trim() || null,
        email: billing.email?.trim() || null,
        address: billing.address?.trim() || null,
        phone_country_code: billing.phone_country_code,
        phone_number: billing.phone_number?.trim() || null,
        tax_ids: (billing.tax_ids || []).filter((s) => s.trim()),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    setBillingSaving(false);
    if (error) {
      setBillingErr(error.message);
      return;
    }
    setBillingSavedAt(performance.now());
    setTimeout(() => setBillingSavedAt(null), 2000);
  }

  return (
    <>
      <fieldset className="fieldset">
        <legend>{t("Payment methods")}</legend>
        {methods === null && !methodsErr && (
          <div className="text-sm text-gray-400">{t("Loading…")}</div>
        )}
        {methodsErr && <div className="text-sm text-red">{t("Error")}: {methodsErr}</div>}
        {methods && methods.length === 0 && (
          <div className="text-sm text-gray-400">{t("No payment methods added yet.")}</div>
        )}
        {methods?.map((m) => (
          <MethodCard
            key={m.id}
            method={m}
            onSetDefault={() => makeDefault(m.id)}
            onRemove={() => removeMethod(m.id)}
          />
        ))}
        <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => setShowAdd(true)}>
          + {t("Add payment method")}
        </button>
      </fieldset>

      <fieldset className="fieldset" style={{ marginTop: 20 }}>
        <legend>{t("Billing information")}</legend>
        <form onSubmit={saveBilling}>
          <div className="form-row">
            <div className="form-group">
              <label>{t("Full name")}</label>
              <input
                type="text"
                placeholder={t("Your legal name")}
                value={billing.full_name || ""}
                onChange={(e) => setBilling({ ...billing, full_name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>{t("Billing email")}</label>
              <input
                type="email"
                placeholder="billing@example.com"
                value={billing.email || ""}
                onChange={(e) => setBilling({ ...billing, email: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label>{t("Address")}</label>
            <input
              type="text"
              placeholder={t("Street, city, postcode, country")}
              value={billing.address || ""}
              onChange={(e) => setBilling({ ...billing, address: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>{t("Phone number")}</label>
            <div className="flex gap-2">
              <select
                className="w-[110px] flex-shrink-0"
                value={billing.phone_country_code || "+41"}
                onChange={(e) => setBilling({ ...billing, phone_country_code: e.target.value })}
              >
                {PHONE_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                className="flex-1"
                placeholder="79 123 45 67"
                value={billing.phone_number || ""}
                onChange={(e) => setBilling({ ...billing, phone_number: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label>
              {t("Tax ID(s)")}{" "}
              <span className="text-xs text-gray-400 font-normal">
                ({t("optional — add multiple")})
              </span>
            </label>
            <div className="flex flex-col gap-2 mb-2">
              {(billing.tax_ids || []).map((id, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1"
                    placeholder="e.g. CHE-123.456.789"
                    value={id}
                    onChange={(e) => {
                      const arr = [...(billing.tax_ids || [])];
                      arr[i] = e.target.value;
                      setBilling({ ...billing, tax_ids: arr });
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: "6px 10px", color: "var(--red)" }}
                    onClick={() => {
                      const arr = [...(billing.tax_ids || [])];
                      arr.splice(i, 1);
                      setBilling({ ...billing, tax_ids: arr });
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ padding: "6px 10px" }}
              onClick={() => setBilling({ ...billing, tax_ids: [...(billing.tax_ids || []), ""] })}
            >
              + {t("Add Tax ID")}
            </button>
          </div>

          {billingErr && <div className="text-red text-sm mb-2">{billingErr}</div>}
          <button
            type="submit"
            disabled={billingSaving}
            className="btn btn-primary btn-sm"
            style={billingSavedAt ? { background: "var(--green)" } : undefined}
          >
            {billingSavedAt
              ? `✓ ${t("Saved")}`
              : billingSaving
                ? t("Saving…")
                : t("Save billing information")}
          </button>
        </form>
      </fieldset>

      <fieldset className="fieldset" style={{ marginTop: 20 }}>
        <legend>{t("Invoice history")}</legend>
        {invoices === null && !invoicesErr && (
          <div className="text-sm text-gray-400">{t("Loading…")}</div>
        )}
        {invoicesErr && <div className="text-sm text-red">{t("Error")}: {invoicesErr}</div>}
        {invoices && invoices.length === 0 && (
          <div className="text-sm text-gray-400">{t("No invoices yet.")}</div>
        )}
        {invoices?.map((inv) => (
          <InvoiceRow key={inv.id} invoice={inv} />
        ))}
      </fieldset>

      {showAdd && (
        <AddPaymentModal
          userId={userId}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            reloadMethods();
          }}
        />
      )}
    </>
  );
}

function MethodCard({
  method: m,
  onSetDefault,
  onRemove,
}: {
  method: PaymentMethod;
  onSetDefault: () => void;
  onRemove: () => void;
}) {
  const t = useT();
  const icon =
    m.method_type === "wire_transfer"
      ? "🏦"
      : m.method_type === "credit_card"
        ? "💳"
        : m.method_type === "twint"
          ? "📱"
          : "💰";
  const name =
    m.method_type === "wire_transfer"
      ? `${t("Wire transfer")} — ${m.iban || t("IBAN not set")}`
      : m.method_type === "credit_card"
        ? `${m.card_brand === "visa" ? "Visa" : m.card_brand === "mastercard" ? "Mastercard" : "Card"} •••• ${m.card_last4 || "????"}`
        : m.method_type === "twint"
          ? `TWINT — ${m.twint_phone || ""}`
          : m.method_type;
  const sub =
    m.method_type === "wire_transfer"
      ? m.bank_name || m.account_holder || ""
      : m.method_type === "credit_card"
        ? `${t("Expires")} ${m.card_expiry || "—"} · ${m.cardholder_name || ""}`
        : "";

  return (
    <div
      className="flex items-center gap-3.5 mb-3 px-5 py-4 border rounded-[2px]"
      style={{
        borderColor: m.is_default ? "#86EFAC" : "var(--gray-200)",
        background: m.is_default ? "#F0FDF4" : undefined,
      }}
    >
      <div className="text-2xl flex-shrink-0 w-9 text-center">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[0.9rem]">
          {name}
          {m.is_default && (
            <span className="badge badge-green ml-1.5" style={{ fontSize: ".7rem" }}>
              {t("Default")}
            </span>
          )}
        </div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        {!m.is_default && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: ".8rem", padding: "5px 10px" }}
            onClick={onSetDefault}
          >
            {t("Set default")}
          </button>
        )}
        <button
          className="btn btn-outline btn-sm"
          style={{
            color: "var(--red)",
            borderColor: "var(--red)",
            fontSize: ".8rem",
            padding: "5px 10px",
          }}
          onClick={onRemove}
        >
          {t("Remove")}
        </button>
      </div>
    </div>
  );
}

function InvoiceRow({ invoice: inv }: { invoice: Invoice }) {
  const t = useT();
  const date = new Date(inv.issued_at).toLocaleDateString("en-CH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const badge =
    inv.status === "paid"
      ? "badge-green"
      : inv.status === "pending"
        ? "badge-amber"
        : inv.status === "overdue"
          ? "badge-red"
          : "badge-gray";
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold">{inv.invoice_number}</div>
        <div className="text-xs text-gray-400">
          {inv.description || "—"} · {date}
        </div>
      </div>
      <div className="font-bold text-[0.9rem] flex-shrink-0 mr-3">
        CHF {Number(inv.amount_chf).toFixed(2)}
      </div>
      <span className={`badge ${badge} flex-shrink-0`} style={{ fontSize: ".7rem" }}>
        {t(inv.status)}
      </span>
    </div>
  );
}

function AddPaymentModal({
  userId,
  onClose,
  onSaved,
}: {
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useT();
  const [type, setType] = useState<"" | "wire_transfer" | "credit_card" | "twint">("");
  const [isDefault, setIsDefault] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [wire, setWire] = useState({ account_holder: "", iban: "", bank_name: "", bic: "" });
  const [card, setCard] = useState({
    card_brand: "",
    cardholder_name: "",
    card_last4: "",
    card_expiry: "",
  });
  const [twint, setTwint] = useState({ cc: "+41", phone: "" });

  async function save() {
    setErr(null);
    if (!type) {
      setErr(t("Please select a method type."));
      return;
    }
    const fields: Record<string, unknown> = { method_type: type, is_default: isDefault };
    if (type === "wire_transfer") {
      if (!wire.account_holder.trim() || !wire.iban.trim()) {
        setErr(t("Account holder and IBAN are required."));
        return;
      }
      fields.account_holder = wire.account_holder.trim();
      fields.iban = wire.iban.trim().toUpperCase().replace(/\s/g, "");
      fields.bank_name = wire.bank_name.trim() || null;
      fields.bic = wire.bic.trim().toUpperCase() || null;
    } else if (type === "credit_card") {
      if (!card.card_brand || !card.cardholder_name.trim() || !card.card_last4 || !card.card_expiry) {
        setErr(t("All card fields are required."));
        return;
      }
      fields.card_brand = card.card_brand;
      fields.cardholder_name = card.cardholder_name.trim();
      fields.card_last4 = card.card_last4.trim();
      fields.card_expiry = card.card_expiry.trim();
    } else if (type === "twint") {
      if (!twint.phone.trim()) {
        setErr(t("TWINT phone number is required."));
        return;
      }
      fields.twint_phone = `${twint.cc} ${twint.phone.trim()}`;
    }
    setSaving(true);
    const sb = createClient();
    if (isDefault) {
      await sb.from("payment_methods").update({ is_default: false }).eq("user_id", userId);
    }
    const { error } = await sb
      .from("payment_methods")
      .insert({ user_id: userId, ...fields });
    setSaving(false);
    if (error) {
      setErr(error.message);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-charcoal/45 z-[200] flex items-center justify-center p-4">
      <div
        className="bg-white rounded-[2px] w-full max-w-[500px] p-8 shadow-lg overflow-y-auto"
        style={{ maxHeight: "90vh" }}
      >
        <div className="flex justify-between items-center mb-5">
          <div className="font-bold text-[1.05rem]">{t("Add payment method")}</div>
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-charcoal leading-none"
          >
            ×
          </button>
        </div>
        {err && <div className="text-red text-sm mb-3">{err}</div>}

        <div className="form-group">
          <label>
            {t("Method type")} <span className="req">*</span>
          </label>
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="">— {t("Select method")}</option>
            <option value="wire_transfer">{t("Wire transfer (IBAN)")}</option>
            <option value="credit_card">{t("Credit card (Visa / Mastercard)")}</option>
            <option value="twint">TWINT</option>
          </select>
        </div>

        {type === "wire_transfer" && (
          <>
            <div className="form-group">
              <label>
                {t("Account holder")} <span className="req">*</span>
              </label>
              <input
                type="text"
                placeholder={t("Full legal name")}
                value={wire.account_holder}
                onChange={(e) => setWire({ ...wire, account_holder: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>
                IBAN <span className="req">*</span>
              </label>
              <input
                type="text"
                placeholder="CH56 0483 5012 3456 7800 9"
                value={wire.iban}
                onChange={(e) => setWire({ ...wire, iban: e.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>{t("Bank name")}</label>
                <input
                  type="text"
                  placeholder={t("e.g. UBS, Credit Suisse")}
                  value={wire.bank_name}
                  onChange={(e) => setWire({ ...wire, bank_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>BIC / SWIFT</label>
                <input
                  type="text"
                  placeholder="UBSWCHZH80A"
                  value={wire.bic}
                  onChange={(e) => setWire({ ...wire, bic: e.target.value })}
                />
              </div>
            </div>
          </>
        )}

        {type === "credit_card" && (
          <>
            <div className="form-group">
              <label>
                {t("Card brand")} <span className="req">*</span>
              </label>
              <select
                value={card.card_brand}
                onChange={(e) => setCard({ ...card, card_brand: e.target.value })}
              >
                <option value="">— {t("Select")}</option>
                <option value="visa">Visa</option>
                <option value="mastercard">Mastercard</option>
              </select>
            </div>
            <div className="form-group">
              <label>
                {t("Cardholder name")} <span className="req">*</span>
              </label>
              <input
                type="text"
                placeholder={t("As printed on card")}
                value={card.cardholder_name}
                onChange={(e) => setCard({ ...card, cardholder_name: e.target.value })}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>
                  {t("Last 4 digits")} <span className="req">*</span>
                </label>
                <input
                  type="text"
                  placeholder="1234"
                  maxLength={4}
                  value={card.card_last4}
                  onChange={(e) => setCard({ ...card, card_last4: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>
                  {t("Expiry (MM/YY)")} <span className="req">*</span>
                </label>
                <input
                  type="text"
                  placeholder="12/27"
                  maxLength={5}
                  value={card.card_expiry}
                  onChange={(e) => setCard({ ...card, card_expiry: e.target.value })}
                />
              </div>
            </div>
            <div className="alert alert-info text-xs">
              <span>ℹ️</span>
              <span>
                {t(
                  "We store only the last 4 digits and expiry for display. Full card numbers are never stored.",
                )}
              </span>
            </div>
          </>
        )}

        {type === "twint" && (
          <div className="form-group">
            <label>
              {t("TWINT phone number")} <span className="req">*</span>
            </label>
            <div className="flex gap-2">
              <select
                className="w-[110px] flex-shrink-0"
                value={twint.cc}
                onChange={(e) => setTwint({ ...twint, cc: e.target.value })}
              >
                <option value="+41">🇨🇭 +41</option>
                <option value="+33">🇫🇷 +33</option>
                <option value="+49">🇩🇪 +49</option>
              </select>
              <input
                type="tel"
                className="flex-1"
                placeholder="79 123 45 67"
                value={twint.phone}
                onChange={(e) => setTwint({ ...twint, phone: e.target.value })}
              />
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="inline-flex items-center gap-2.5 cursor-pointer font-normal">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
            />
            <span className="text-sm">{t("Set as default payment method")}</span>
          </label>
        </div>

        <div className="flex gap-2.5 mt-5">
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? t("Saving…") : t("Add method")}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>
            {t("Cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared primitives ────────────────────────────────────────

function Row({
  title,
  desc,
  action,
}: {
  title: string;
  desc: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-5 flex-wrap">
      <div>
        <div className="font-semibold text-[0.9rem]">{title}</div>
        <div className="text-sm text-gray-400 mt-1">{desc}</div>
      </div>
      <div className="flex-shrink-0">{action}</div>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-gray-200" />;
}

function Toggle({
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
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="font-semibold text-[0.9rem]">{title}</div>
        <div className="text-sm text-gray-400 mt-1">{desc}</div>
      </div>
      <label className="toggle inline-flex items-center flex-shrink-0 cursor-pointer">
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
