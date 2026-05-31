"use client";

import { createContext, useContext } from "react";

export type AdminContextValue = {
  userId: string;
  email: string;
};

export const AdminCtx = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminCtx);
  if (!ctx) throw new Error("useAdmin must be used inside the admin layout");
  return ctx;
}
