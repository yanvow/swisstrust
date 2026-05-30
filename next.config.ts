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
      { source: "/tenant/profile.html", destination: "/tenant/profile", permanent: false },
      { source: "/tenant/documents.html", destination: "/tenant/documents", permanent: false },
      { source: "/tenant/certificates.html", destination: "/tenant/certificates", permanent: false },
      { source: "/tenant/certificate-new.html", destination: "/tenant/certificate-new", permanent: false },
      { source: "/tenant/settings.html", destination: "/tenant/settings", permanent: false },
      { source: "/agency/dashboard.html", destination: "/agency/dashboard", permanent: false },
      { source: "/agency/dossier.html", destination: "/agency/dossier", permanent: false },
      { source: "/agency/profile.html", destination: "/agency/profile", permanent: false },
      { source: "/agency/settings.html", destination: "/agency/settings", permanent: false },
      { source: "/owner/dashboard.html", destination: "/owner/dashboard", permanent: false },
      { source: "/owner/dossier.html", destination: "/owner/dossier", permanent: false },
      { source: "/owner/settings.html", destination: "/owner/settings", permanent: false },
      { source: "/verify.html", destination: "/verify", permanent: false },
      { source: "/cert/cert-view.html", destination: "/cert/cert-view", permanent: false },
    ];
  },
};

export default config;
