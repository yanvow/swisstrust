"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n";

export default function AdminSidebar({
  open,
  onClose,
  pendingDocs,
}: {
  open: boolean;
  onClose: () => void;
  pendingDocs: number;
}) {
  const t = useT();
  const pathname = usePathname();

  const sections: { label: string; items: { href: string; icon: string; label: string; badge?: string }[] }[] = [
    {
      label: t("Overview"),
      items: [{ href: "/admin/dashboard", icon: "⊞", label: t("Dashboard") }],
    },
    {
      label: t("Users"),
      items: [
        { href: "/admin/tenants", icon: "👤", label: t("Tenants") },
        { href: "/admin/agencies", icon: "🏢", label: t("Agencies") },
        { href: "/admin/owners", icon: "🏠", label: t("Owners") },
      ],
    },
    {
      label: t("Content"),
      items: [
        {
          href: "/admin/documents",
          icon: "📄",
          label: t("Documents"),
          badge: pendingDocs > 0 ? String(pendingDocs) : undefined,
        },
        { href: "/admin/certificates", icon: "🪪", label: t("Certificates") },
      ],
    },
  ];

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
