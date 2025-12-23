import { allowedRolesForPath, defaultHomeForRole, hasAccess } from "./rbac";

describe("rbac", () => {
  it("returns allowed roles for known prefixes", () => {
    expect(allowedRolesForPath("/app/admin")?.includes("SCHOOL_ADMIN")).toBe(
      true
    );
    expect(allowedRolesForPath("/app/teacher/classes")?.includes("TEACHER")).toBe(
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
    expect(hasAccess("/app/admin", "STUDENT")).toBe(false);
    expect(hasAccess("/app/teacher", null)).toBe(false);
  });

  it("maps role to default home", () => {
    expect(defaultHomeForRole("SCHOOL_ADMIN")).toBe("/app/admin");
    expect(defaultHomeForRole("TEACHER")).toBe("/app/teacher");
    expect(defaultHomeForRole("STUDENT")).toBe("/app/student");
    expect(defaultHomeForRole("SUPER_ADMIN")).toBe("/super-admin");
  });
});
