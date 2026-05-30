"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n";

export default function TenantSidebar({
  open,
  onClose,
  pendingRequestCount,
}: {
  open: boolean;
  onClose: () => void;
  pendingRequestCount: number;
}) {
  const t = useT();
  const pathname = usePathname();

  const sections: Section[] = [
    {
      label: t("My dossier"),
      items: [
        { href: "/tenant/dashboard", icon: "⊞", label: t("Dashboard") },
        { href: "/tenant/profile", icon: "◎", label: t("My profile") },
        { href: "/tenant/documents", icon: "📄", label: t("Documents") },
      ],
    },
    {
      label: t("Certificates"),
      items: [
        { href: "/tenant/certificates", icon: "🪪", label: t("My certificates") },
        { href: "/tenant/certificate-new", icon: "＋", label: t("New certificate") },
      ],
    },
    {
      label: t("Other"),
      items: [{ href: "/verify.html", icon: "✓", label: t("Verify a certificate") }],
    },
    {
      label: t("Account"),
      items: [{ href: "/tenant/settings", icon: "⚙", label: t("Settings") }],
    },
  ];

  if (pendingRequestCount > 0) {
    sections.push({
      label: t("Notifications"),
      items: [
        {
          href: "/tenant/dashboard",
          icon: "🔔",
          label: t("Access requests"),
          badge: String(pendingRequestCount),
        },
      ],
    });
  }

  return (
    <>
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-charcoal/40 z-30"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={[
          "bg-gray-100 border-r border-gray-200 w-[220px] py-6 overflow-y-auto",
          "md:sticky md:top-[60px] md:h-[calc(100vh-60px)] md:translate-x-0",
          open
            ? "fixed top-[60px] bottom-0 left-0 z-40 translate-x-0 transition-transform"
            : "fixed top-[60px] bottom-0 left-0 z-40 -translate-x-full md:translate-x-0 transition-transform",
        ].join(" ")}
      >
        {sections.map((section) => (
          <div key={section.label} className="px-3 pb-6">
            <div className="text-xs font-semibold text-gray-400 tracking-wider uppercase px-3 pb-2">
              {section.label}
            </div>
            {section.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  onClick={onClose}
                  className={[
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-[2px] text-[0.9rem] transition-colors",
                    active
                      ? "bg-white text-charcoal font-semibold shadow-subtle"
                      : "text-gray-600 hover:bg-gray-200 hover:text-charcoal",
                  ].join(" ")}
                >
                  <span className="w-[18px] text-center opacity-70">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge ? (
                    <span className="badge badge-amber text-[0.7rem]">{item.badge}</span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </aside>
    </>
  );
}

type Section = {
  label: string;
  items: { href: string; icon: string; label: string; badge?: string }[];
};
