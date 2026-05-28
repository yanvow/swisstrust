import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  webpack: (cfg) => {
    // Legacy lib/*.js files (pre-React, served to static HTML pages) live next
    // to new lib/*.ts(x) modules. Force TypeScript files to take precedence so
    // `@/lib/i18n` resolves to the new lib/i18n.tsx instead of the legacy .js.
    const tsExts = [".tsx", ".ts", ".mts", ".cts"];
    const existing: string[] = cfg.resolve.extensions ?? [];
    cfg.resolve.extensions = [
      ...tsExts,
      ...existing.filter((e) => !tsExts.includes(e)),
    ];
    return cfg;
  },
};

export default config;
