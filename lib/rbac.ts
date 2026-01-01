import { Role } from "@prisma/client";

type Rule = {
  prefix: string;
  allowed: Role[];
};

const rules: Rule[] = [
  { prefix: "/admin", allowed: ["SCHOOL_ADMIN"] },
  { prefix: "/teacher", allowed: ["TEACHER", "SCHOOL_ADMIN"] },
  { prefix: "/student", allowed: ["STUDENT", "SCHOOL_ADMIN", "TEACHER"] },
  { prefix: "/super-admin", allowed: ["SUPER_ADMIN"] },
];

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export function allowedRolesForPath(pathname: string): Role[] | null {
  const normalized = normalizePath(pathname);
  const match = rules.find((rule) =>
    normalized === rule.prefix || normalized.startsWith(`${rule.prefix}/`)
  );
  return match?.allowed ?? null;
}

export function hasAccess(pathname: string, role?: Role | null): boolean {
  if (!role) return false;
  const allowed = allowedRolesForPath(pathname);
  if (!allowed) return true;
  return allowed.includes(role);
}

export function defaultHomeForRole(role?: Role | null): string {
  if (!role) return "/login";
  if (role === "SUPER_ADMIN") return "/super-admin";
  if (role === "SCHOOL_ADMIN") return "/admin";
  if (role === "TEACHER") return "/teacher";
  return "/student";
}
