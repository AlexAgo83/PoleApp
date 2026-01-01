import { allowedRolesForPath, defaultHomeForRole, hasAccess } from "./rbac";

describe("rbac", () => {
  it("returns allowed roles for known prefixes", () => {
    expect(allowedRolesForPath("/admin")?.includes("SCHOOL_ADMIN")).toBe(
      true
    );
    expect(allowedRolesForPath("/teacher/classes")?.includes("TEACHER")).toBe(
      true
    );
    expect(allowedRolesForPath("/student/progress")?.includes("STUDENT")).toBe(
      true
    );
    expect(allowedRolesForPath("/super-admin")?.includes("SUPER_ADMIN")).toBe(
      true
    );
  });

  it("denies when role missing or mismatch", () => {
    expect(hasAccess("/admin", "STUDENT")).toBe(false);
    expect(hasAccess("/teacher", null)).toBe(false);
  });

  it("maps role to default home", () => {
    expect(defaultHomeForRole("SCHOOL_ADMIN")).toBe("/admin");
    expect(defaultHomeForRole("TEACHER")).toBe("/teacher");
    expect(defaultHomeForRole("STUDENT")).toBe("/student");
    expect(defaultHomeForRole("SUPER_ADMIN")).toBe("/super-admin");
  });
});
