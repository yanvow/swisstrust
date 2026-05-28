// Types and pure helpers for the tenant dashboard. Mirrors the legacy
// public/tenant/dashboard.html doc-type registry and cert-validity logic.

export type TenantRow = {
  id: string;
  user_id: string;
  nationality?: string | null;
  permit_type?: string | null;
  needs_guarantor?: boolean | null;
  guarantor_is_employee?: boolean | null;
  guarantor_is_self_employed?: boolean | null;
  is_employee?: boolean | null;
  is_self_employed?: boolean | null;
  is_unemployed?: boolean | null;
  is_on_welfare?: boolean | null;
  employer_name?: string | null;
  monthly_gross_salary?: number | null;
  profile_complete?: boolean | null;
  total_doc_uploads?: number | null;
};

export type DocStatus = "pending" | "processing" | "auto_verified" | "flagged" | "rejected";

export type DocumentRow = {
  id: string;
  doc_type: string;
  status: DocStatus;
  created_at: string;
  confidence_score?: number | null;
  ocr_extracted_data?: {
    expiry_date?: string;
    valid_until?: string;
    certificate_date?: string;
    pay_period?: string;
    [k: string]: unknown;
  } | null;
};

export type CertificateRow = {
  id: string;
  cert_code: string;
  property_address?: string | null;
  property_city?: string | null;
  mode?: string | null;
};

export type AccessRequestRow = {
  id: string;
  status: string;
  requester_type: string;
  requester_name: string | null;
  message: string | null;
  requested_at: string;
  certificates: CertificateRow | null;
};

export type DocTypeMeta = {
  key: string;
  label: string;
  icon: string;
};

export function getDocTypeMeta(tenant: TenantRow): DocTypeMeta[] {
  const isSwiss = tenant.permit_type === "swiss" || tenant.nationality === "Swiss";
  const needsGuarantor = !!tenant.needs_guarantor;
  const guarantorIsEmployee = !!tenant.guarantor_is_employee;
  const guarantorIsSelfEmployed = !!tenant.guarantor_is_self_employed;
  const isEmployee = !!tenant.is_employee;
  const isSelfEmployed = !!tenant.is_self_employed;
  const isUnemployed = !!tenant.is_unemployed;
  const isOnWelfare = !!tenant.is_on_welfare;

  const types: DocTypeMeta[] = [];

  types.push({ key: "passport_id", label: isSwiss ? "Passport or Swiss ID" : "Passport", icon: "🪪" });
  if (!isSwiss) types.push({ key: "residence_permit", label: "Residence permit", icon: "📋" });
  types.push({ key: "betreibungsauszug", label: "Debt enforcement register extract", icon: "⚖️" });

  if (needsGuarantor) {
    types.push({ key: "guarantor_id", label: "Guarantor — Passport or ID", icon: "🪪" });
    types.push({
      key: "guarantor_betreibungsauszug",
      label: "Guarantor — Debt register extract",
      icon: "⚖️",
    });
    if (guarantorIsEmployee) {
      types.push({ key: "guarantor_salary_slip_1", label: "Guarantor — Salary slip 1", icon: "💰" });
      types.push({ key: "guarantor_salary_slip_2", label: "Guarantor — Salary slip 2", icon: "💰" });
      types.push({ key: "guarantor_salary_slip_3", label: "Guarantor — Salary slip 3", icon: "💰" });
    }
    if (guarantorIsSelfEmployed) {
      types.push({ key: "guarantor_balance_sheet", label: "Guarantor — Balance sheets & P&L", icon: "📊" });
      types.push({ key: "guarantor_tax_assessment", label: "Guarantor — Tax assessment notice", icon: "🧾" });
      types.push({ key: "guarantor_bank_statement", label: "Guarantor — Bank statements", icon: "🏦" });
      types.push({ key: "guarantor_net_income_proof", label: "Guarantor — Net income proof", icon: "💵" });
    }
  } else {
    if (isEmployee) {
      types.push({ key: "salary_slip_1", label: "Salary slip — month 1", icon: "💰" });
      types.push({ key: "salary_slip_2", label: "Salary slip — month 2", icon: "💰" });
      types.push({ key: "salary_slip_3", label: "Salary slip — month 3", icon: "💰" });
    }
    if (isSelfEmployed) {
      types.push({ key: "balance_sheet", label: "Balance sheets & P&L", icon: "📊" });
      types.push({ key: "tax_assessment", label: "Tax assessment notice", icon: "🧾" });
      types.push({ key: "bank_statement", label: "Bank statements", icon: "🏦" });
      types.push({ key: "net_income_proof", label: "Net income proof", icon: "💵" });
      types.push({ key: "turnover_proof", label: "Turnover / Revenue", icon: "📈" });
      types.push({ key: "avs_affiliation", label: "AVS/SVA affiliation", icon: "🏛️" });
      types.push({ key: "commercial_register", label: "Commercial register extract", icon: "📝" });
    }
    if (isUnemployed) {
      types.push({ key: "unemployment_benefit_1", label: "Unemployment benefit statement — month 1", icon: "📑" });
      types.push({ key: "unemployment_benefit_2", label: "Unemployment benefit statement — month 2", icon: "📑" });
      types.push({ key: "unemployment_benefit_3", label: "Unemployment benefit statement — month 3", icon: "📑" });
    }
    if (isOnWelfare) {
      types.push({ key: "welfare_rent_coverage", label: "Certificate of rent coverage", icon: "🏛️" });
    }
  }

  return types;
}

export function computeCertValidity(
  docs: DocumentRow[] | null | undefined,
  tenant: TenantRow,
): { valid: boolean; reasons: string[] } {
  const byType: Record<string, DocumentRow> = {};
  (docs || []).forEach((d) => {
    byType[d.doc_type] = d;
  });
  const now = new Date();
  const reasons: string[] = [];
  const present = (type: string) => byType[type] && byType[type].status !== "rejected";

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

  const cutoff3mo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const slipOk = (type: string) => {
    if (!present(type)) return false;
    const pp = byType[type].ocr_extracted_data?.pay_period;
    if (!pp) return true;
    const [y, m] = pp.split("-").map(Number);
    return new Date(y, m - 1, 1) >= cutoff3mo;
  };

  if (
    tenant.is_employee &&
    (!slipOk("salary_slip_1") || !slipOk("salary_slip_2") || !slipOk("salary_slip_3"))
  ) {
    reasons.push("Salary slips missing, rejected, or outdated");
  }
  if (tenant.is_self_employed) {
    if (!present("balance_sheet")) reasons.push("Balance sheet missing or rejected");
    if (!present("tax_assessment")) reasons.push("Tax assessment missing or rejected");
  }
  if (
    tenant.is_unemployed &&
    (!slipOk("unemployment_benefit_1") || !slipOk("unemployment_benefit_2") || !slipOk("unemployment_benefit_3"))
  ) {
    reasons.push("Unemployment benefit statements missing, rejected, or outdated");
  }
  if (tenant.is_on_welfare && !present("welfare_rent_coverage")) {
    reasons.push("Welfare / rent coverage letter missing or rejected");
  }

  return { valid: reasons.length === 0, reasons };
}

export const STATUS_LABEL: Record<DocStatus, string> = {
  pending: "Pending review",
  processing: "Processing…",
  auto_verified: "Auto-verified",
  flagged: "Flagged",
  rejected: "Rejected",
};

export const STATUS_BADGE_CLASS: Record<DocStatus, string> = {
  pending: "badge badge-amber",
  processing: "badge badge-blue",
  auto_verified: "badge badge-green",
  flagged: "badge badge-amber",
  rejected: "badge badge-red",
};
