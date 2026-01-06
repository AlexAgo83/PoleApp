import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "./proxy";

const getTokenMock = vi.fn();
const hasAccessMock = vi.fn();
const allowedRolesForPathMock = vi.fn();

vi.mock("next-auth/jwt", () => ({
  getToken: (...args: unknown[]) => getTokenMock(...args),
}));
vi.mock("@/lib/rbac", () => ({
  hasAccess: (...args: unknown[]) => hasAccessMock(...args),
  allowedRolesForPath: (...args: unknown[]) => allowedRolesForPathMock(...args),
}));

describe("proxy (middleware)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("redirects to login when no token", async () => {
    getTokenMock.mockResolvedValue(null);
    const req = new NextRequest("http://localhost/teacher/courses?foo=bar");

    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/login?callbackUrl=%2Fteacher%2Fcourses%3Ffoo%3Dbar");
  });

  it("redirects to access-denied when role unauthorized", async () => {
    getTokenMock.mockResolvedValue({ role: "STUDENT" });
    hasAccessMock.mockReturnValue(false);
    allowedRolesForPathMock.mockReturnValue(["TEACHER"]);
    const req = new NextRequest("http://localhost/teacher/courses");

    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost/access-denied?required=TEACHER");
  });

  it("lets the request pass when authorized", async () => {
    getTokenMock.mockResolvedValue({ role: "TEACHER" });
    hasAccessMock.mockReturnValue(true);
    const req = new NextRequest("http://localhost/teacher/courses");

    const res = await proxy(req);

    expect(res.status).toBe(200);
  });

  it("allows SCHOOL_ADMIN on /admin", async () => {
    getTokenMock.mockResolvedValue({ role: "SCHOOL_ADMIN" });
    hasAccessMock.mockReturnValue(true);
    const req = new NextRequest("http://localhost/admin");

    const res = await proxy(req);

    expect(res.status).toBe(200);
  });

  it("passes through public path when authorized", async () => {
    getTokenMock.mockResolvedValue({ role: "TEACHER" });
    hasAccessMock.mockReturnValue(true);
    const req = new NextRequest("http://localhost/student");

    const res = await proxy(req);

    expect(res.status).toBe(200);
  });

  it("redirects when role is null/invalid", async () => {
    getTokenMock.mockResolvedValue({ role: null });
    hasAccessMock.mockReturnValue(false);
    allowedRolesForPathMock.mockReturnValue(["TEACHER"]);
    const req = new NextRequest("http://localhost/teacher/courses");

    const res = await proxy(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/access-denied");
  });
});
