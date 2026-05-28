"use client";

import { createContext, useContext } from "react";

export type TenantContextValue = {
  userId: string;
  displayName: string;
  email: string;
  pendingCount: number;
  setPendingCount: (n: number) => void;
};

export const TenantCtx = createContext<TenantContextValue | null>(null);

export function useTenant(): TenantContextValue {
  const v = useContext(TenantCtx);
  if (!v) throw new Error("useTenant must be used inside the tenant layout");
  return v;
}
