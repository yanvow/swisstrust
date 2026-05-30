"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n";

export default function OwnerSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const pathname = usePathname();

  const sections = [
    {
      label: t("Private owner"),
      items: [
        { href: "/owner/dashboard", icon: "⊞", label: t("Dashboard") },
        { href: "/owner/dashboard#verify-card", icon: "✓", label: t("Verify certificate") },
        { href: "/owner/dashboard#recent-section", icon: "◷", label: t("Recent activity") },
      ],
    },
    {
      label: t("Account"),
      items: [{ href: "/owner/settings", icon: "⚙", label: t("Settings") }],
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
              const hrefPath = item.href.split("#")[0];
              const active =
                pathname === hrefPath ||
                (hrefPath === "/owner/dashboard" && pathname?.startsWith("/owner/dossier"));
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
                </Link>
              );
            })}
          </div>
        ))}
      </aside>
    </>
  );
}
