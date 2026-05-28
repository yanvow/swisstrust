"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

export function Field({
  id,
  label,
  required,
  hint,
  children,
}: {
  id: string;
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mb-5">
      <label htmlFor={id} className="block text-sm font-medium mb-1.5 text-charcoal">
        {label}
        {required ? <span className="text-red ml-0.5">*</span> : null}
      </label>
      {children}
      {hint ? <div className="text-[0.8125rem] text-gray-400 mt-1">{hint}</div> : null}
    </div>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-3.5 py-2.5 text-[0.9375rem] border-[1.5px] border-gray-200 rounded-[2px] bg-white text-charcoal focus:outline-none focus:border-charcoal transition-colors placeholder:text-gray-400"
    />
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="text-red text-sm mb-3" role="alert">
      {message}
    </div>
  );
}

export function Divider({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 my-4 text-xs text-gray-400 uppercase tracking-wider">
      <div className="flex-1 h-px bg-gray-200" />
      <span>{children}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

export function SubmitButton({
  loading,
  defaultLabel,
  loadingLabel = "Please wait…",
}: {
  loading: boolean;
  defaultLabel: string;
  loadingLabel?: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="btn btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? loadingLabel : defaultLabel}
    </button>
  );
}
