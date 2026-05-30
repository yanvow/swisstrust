"use client";

import { createContext, useContext } from "react";

export type AgencyContextValue = {
  userId: string;
  email: string;
  displayName: string;
  agencyId: string;
  agencyName: string;
  isAdmin: boolean;
  isVerified: boolean;
};

export const AgencyCtx = createContext<AgencyContextValue | null>(null);

export function useAgency(): AgencyContextValue {
  const ctx = useContext(AgencyCtx);
  if (!ctx) throw new Error("useAgency must be used inside the agency layout");
  return ctx;
}
