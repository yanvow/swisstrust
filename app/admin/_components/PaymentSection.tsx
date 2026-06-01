"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import { useT } from "@/lib/i18n";

type Billing = {
  full_name: string | null;
  email: string | null;
  address: string | null;
  phone_country_code: string | null;
  phone_number: string | null;
  tax_ids: string[] | null;
};
type Method = {
  id: string;
  method_type: string;
  iban: string | null;
  card_brand: string | null;
  card_last4: string | null;
  twint_phone: string | null;
  is_default: boolean | null;
};
type Invoice = {
  id: string;
  invoice_number: string;
  description: string | null;
  issued_at: string;
  amount_chf: number;
  status: string;
};

const INVOICE_BADGE: Record<string, string> = { paid: "badge-green", pending: "badge-amber", overdue: "badge-red" };

// Read-only admin view of a member's billing profile, payment methods and invoices.
// Faithful port of the legacy loadTenantPayment / loadAgencyPayment / loadOwnerPayment helpers.
export default function PaymentSection({ userId }: { userId: string | null }) {
  const t = useT();
  const sb = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [methods, setMethods] = useState<Method[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    (async () => {
      const [b, m, i] = await Promise.all([
        sb.from("billing_profiles").select("*").eq("user_id", userId).maybeSingle(),
        sb.from("payment_methods").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        sb.from("invoices").select("*").eq("user_id", userId).order("issued_at", { ascending: false }),
      ]);
      setBilling((b.data as Billing) || null);
      setMethods((m.data as Method[]) || []);
      setInvoices((i.data as Invoice[]) || []);
      setLoading(false);
    })();
  }, [sb, userId]);

  if (!userId) return <div className="text-sm text-gray">{t("No auth account linked.")}</div>;
  if (loading) return <div className="text-sm text-gray">{t("Loading…")}</div>;
  if (!billing && methods.length === 0 && invoices.length === 0)
    return <div className="text-sm text-gray">{t("No payment information on file.")}</div>;

  const subHead = (label: string) => (
    <div style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>{label}</div>
  );

  return (
    <div>
      {billing && (
        <>
          {subHead(t("Billing info"))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            {billing.full_name && <Cell label={t("Name")} value={billing.full_name} />}
            {billing.email && <Cell label={t("Email")} value={billing.email} />}
            {billing.address && <Cell label={t("Address")} value={billing.address} full />}
            {billing.phone_number && <Cell label={t("Phone")} value={((billing.phone_country_code || "") + " " + billing.phone_number).trim()} />}
            {billing.tax_ids && billing.tax_ids.length > 0 && <Cell label={t("Tax IDs")} value={billing.tax_ids.join(", ")} />}
          </div>
        </>
      )}

      {methods.length > 0 && (
        <>
          {subHead(t("Payment methods"))}
          {methods.map((m) => {
            const icon = m.method_type === "wire_transfer" ? "🏦" : m.method_type === "credit_card" ? "💳" : "📱";
            const name =
              m.method_type === "wire_transfer"
                ? `${t("Wire")} — ${m.iban || ""}`
                : m.method_type === "credit_card"
                  ? `${m.card_brand === "visa" ? "Visa" : "Mastercard"} •••• ${m.card_last4 || ""}`
                  : `TWINT ${m.twint_phone || ""}`;
            return (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--gray-100)" }}>
                <span style={{ fontSize: "1.1rem" }}>{icon}</span>
                <div style={{ flex: 1, fontSize: ".875rem" }}>{name}</div>
                {m.is_default && <span className="badge badge-green" style={{ fontSize: ".65rem" }}>{t("Default")}</span>}
              </div>
            );
          })}
          <div style={{ marginBottom: 12 }} />
        </>
      )}

      {invoices.length > 0 && (
        <>
          {subHead(t("Invoices"))}
          {invoices.map((inv) => (
            <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--gray-100)" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="text-sm font-bold">{inv.invoice_number}</div>
                <div className="text-xs text-gray">{(inv.description || "—") + " · " + new Date(inv.issued_at).toLocaleDateString("en-CH", { day: "2-digit", month: "short", year: "numeric" })}</div>
              </div>
              <div className="text-sm font-bold" style={{ marginRight: 8 }}>CHF {Number(inv.amount_chf).toFixed(2)}</div>
              <span className={`badge ${INVOICE_BADGE[inv.status] || "badge-gray"}`} style={{ fontSize: ".65rem" }}>{inv.status}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function Cell({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div style={full ? { gridColumn: "1 / -1" } : undefined}>
      <span className="text-xs text-gray">{label}</span>
      <div className="text-sm">{value}</div>
    </div>
  );
}
