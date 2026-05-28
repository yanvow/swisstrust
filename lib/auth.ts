export type Role = "tenant" | "agency" | "agent" | "owner" | "admin";

export function dashboardPathForRole(role: string | undefined | null): string {
  if (role === "agency" || role === "agent") return "/agency/dashboard.html";
  if (role === "owner") return "/owner/dashboard.html";
  if (role === "admin") return "/admin/dashboard.html";
  return "/tenant/dashboard.html";
}

export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter.";
  if (!/[a-z]/.test(pw)) return "Password must contain at least one lowercase letter.";
  if (!/[0-9]/.test(pw)) return "Password must contain at least one number.";
  if (!/[^A-Za-z0-9]/.test(pw))
    return "Password must contain at least one special character (e.g. !@#$%).";
  return null;
}
