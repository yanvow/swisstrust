"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthShell({
  title,
  subtitle,
  topRight,
  children,
  maxWidth = 480,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  topRight?: ReactNode;
  children: ReactNode;
  maxWidth?: number;
}) {
  return (
    <>
      <nav className="sticky top-0 z-50 h-[60px] bg-white border-b border-gray-200 flex items-center">
        <div className="container-x w-full flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg">
            <span className="w-8 h-8 bg-red rounded-[2px] flex items-center justify-center text-white font-black">
              C
            </span>
            Checks
          </Link>
          {topRight ? (
            <div className="text-sm text-gray-600 hover:text-charcoal">{topRight}</div>
          ) : null}
        </div>
      </nav>

      <div className="min-h-[calc(100vh-60px)] bg-gray-100 flex items-center justify-center px-6 py-12">
        <div
          className="w-full bg-white border border-gray-200 rounded-[2px] shadow-subtle p-10"
          style={{ maxWidth }}
        >
          <div className="flex items-center gap-2.5 font-bold text-lg mb-4">
            <span className="w-9 h-9 bg-red rounded-[2px] flex items-center justify-center text-white font-black">
              C
            </span>
            Checks
          </div>
          {title ? <h1 className="text-2xl font-bold mb-2 text-charcoal">{title}</h1> : null}
          {subtitle ? <p className="text-gray-600 mb-7">{subtitle}</p> : null}
          {children}
        </div>
      </div>
    </>
  );
}
