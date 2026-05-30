"use client";

import { createContext, useContext } from "react";

export type OwnerContextValue = {
  userId: string;
  email: string;
  displayName: string;
};

export const OwnerCtx = createContext<OwnerContextValue | null>(null);

export function useOwner(): OwnerContextValue {
  const ctx = useContext(OwnerCtx);
  if (!ctx) throw new Error("useOwner must be used inside the owner layout");
  return ctx;
}
