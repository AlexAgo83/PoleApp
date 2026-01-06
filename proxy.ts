import { Role } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { allowedRolesForPath, hasAccess } from "@/lib/rbac";

const loginRoute = "/login";
const accessDeniedRoute = "/access-denied";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL(loginRoute, request.url);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (!hasAccess(pathname, token.role as Role | null | undefined)) {
    const allowed = allowedRolesForPath(pathname);
    const denyUrl = new URL(accessDeniedRoute, request.url);
    if (allowed) {
      denyUrl.searchParams.set("required", allowed.join(","));
    }
    return NextResponse.redirect(denyUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/student/:path*", "/teacher/:path*", "/admin/:path*", "/super-admin/:path*"],
};
