import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: false },
      { source: "/auth/login.html", destination: "/auth/login", permanent: false },
      { source: "/auth/callback.html", destination: "/auth/callback", permanent: false },
      { source: "/auth/forgot-password.html", destination: "/auth/forgot-password", permanent: false },
      { source: "/auth/reset-password.html", destination: "/auth/reset-password", permanent: false },
      { source: "/auth/tenant-register.html", destination: "/auth/tenant-register", permanent: false },
      { source: "/auth/agency-register.html", destination: "/auth/agency-register", permanent: false },
      { source: "/auth/owner-register.html", destination: "/auth/owner-register", permanent: false },
      { source: "/auth/agent-accept.html", destination: "/auth/agent-accept", permanent: false },
      { source: "/tenant/dashboard.html", destination: "/tenant/dashboard", permanent: false },
    ];
  },
};

export default config;
