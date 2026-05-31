"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import AdminNav from "./_components/AdminNav";
import AdminSidebar from "./_components/AdminSidebar";
import { AdminCtx, type AdminContextValue } from "./_components/AdminContext";
import { createClient } from "@/lib/supabase";
import { dashboardPathForRole } from "@/lib/auth";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<AdminContextValue | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [pendingDocs, setPendingDocs] = useState(0);

  useEffect(() => {
    const sb = createClient();
    (async () => {
      const {
        data: { session: s },
      } = await sb.auth.getSession();
      if (!s) {
        const returnPath = window.location.pathname + window.location.search;
        window.location.href = `/auth/login?return=${encodeURIComponent(returnPath)}`;
        return;
      }
      const role = s.user.user_metadata?.role as string | undefined;
      if (role !== "admin") {
        window.location.href = dashboardPathForRole(role);
        return;
      }
      setValue({
        userId: s.user.id,
        email: s.user.email || "",
      });
      setReady(true);

      const { count } = await sb
        .from("documents")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "flagged"]);
      setPendingDocs(count || 0);
    })();
  }, []);

  if (!ready || !value) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <AdminCtx.Provider value={value}>
      <AdminNav
        displayName={value.email}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />
      <div className="md:grid md:grid-cols-[220px_1fr] min-h-[calc(100vh-60px)]">
        <AdminSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          pendingDocs={pendingDocs}
        />
        <main className="px-6 md:px-10 py-10 max-w-[1200px]">{children}</main>
      </div>
    </AdminCtx.Provider>
  );
}
