"use client";

import { useT } from "@/lib/i18n";

export default function CertPreviewCard() {
  const t = useT();
  return (
    <div className="w-[340px] bg-white border border-gray-200 rounded-[2px] shadow-lg overflow-hidden">
      <div className="bg-charcoal text-white px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="w-6 h-6 bg-red rounded-[2px] flex items-center justify-center text-white text-xs font-black">
            C
          </span>
          Checks
        </div>
        <div className="mt-1.5 text-[0.95rem] font-semibold">
          {t("Tenant Verification Certificate")}
        </div>
      </div>
      <div className="p-5">
        <div className="flex gap-5 items-start mb-4">
          <div className="w-[100px] h-[100px] bg-white border border-gray-200 rounded-[2px] flex items-center justify-center">
            <svg viewBox="0 0 21 21" width="80" height="80" xmlns="http://www.w3.org/2000/svg">
              <rect width="21" height="21" fill="white" />
              <rect x="1" y="1" width="7" height="7" fill="none" stroke="#1A1A1A" strokeWidth="1" />
              <rect x="3" y="3" width="3" height="3" fill="#1A1A1A" />
              <rect x="13" y="1" width="7" height="7" fill="none" stroke="#1A1A1A" strokeWidth="1" />
              <rect x="15" y="3" width="3" height="3" fill="#1A1A1A" />
              <rect x="1" y="13" width="7" height="7" fill="none" stroke="#1A1A1A" strokeWidth="1" />
              <rect x="3" y="15" width="3" height="3" fill="#1A1A1A" />
              <rect x="9" y="1" width="1" height="3" fill="#1A1A1A" />
              <rect x="11" y="2" width="1" height="2" fill="#1A1A1A" />
              <rect x="9" y="5" width="3" height="1" fill="#1A1A1A" />
              <rect x="9" y="9" width="5" height="1" fill="#1A1A1A" />
              <rect x="13" y="9" width="1" height="5" fill="#1A1A1A" />
              <rect x="15" y="11" width="3" height="1" fill="#1A1A1A" />
              <rect x="9" y="13" width="1" height="7" fill="#1A1A1A" />
              <rect x="11" y="14" width="3" height="1" fill="#1A1A1A" />
              <rect x="17" y="13" width="3" height="3" fill="#1A1A1A" />
              <rect x="11" y="17" width="5" height="1" fill="#1A1A1A" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="verified-badge text-xs px-2.5 py-1 mb-2">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                  clipRule="evenodd"
                />
              </svg>
              {t("Identity Verified")}
            </div>
            <div className="font-mono text-sm font-semibold tracking-wider">STD-2G7K-X4NP</div>
            <div className="mt-2 text-xs text-gray-400">{t("Valid certificate")}</div>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          <Row label={t("Tenant")} value="Anna M." />
          <Row label={t("Status")} valueNode={<span className="badge badge-green">{t("✓ Valid")}</span>} />
          <Row
            label={t("Eligibility")}
            valueNode={<span className="badge badge-green">{t("✓ Income qualifies")}</span>}
          />
          <Row label={t("Household")} value={t("2 occupants · No pets")} />
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  valueNode,
}: {
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium">{valueNode ?? value}</span>
    </div>
  );
}
