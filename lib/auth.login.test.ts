import { describe, it, expect, vi, beforeEach } from "vitest";
import { authorizeCredentials } from "./auth";
import { prisma } from "./prisma";

vi.mock("./prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

type MockedPrisma = typeof prisma & {
  user: { findUnique: ReturnType<typeof vi.fn> };
};
const prismaMock = prisma as unknown as MockedPrisma;

describe("auth authorize login guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns user when credentials valid and account active/verified", async () => {
    const passwordHash = await (await import("bcryptjs")).hash("pwd", 4);
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "ok@test.dev",
      passwordHash,
      role: "STUDENT",
      schoolId: "s1",
      isPremium: false,
      credits: 10,
      verifiedAt: new Date(),
      disabledAt: null,
      name: "User Test",
    });

    const result = await authorizeCredentials({ email: "ok@test.dev", password: "pwd" });

    expect(result?.id).toBe("u1");
  });

  it("throws when account is disabled", async () => {
    const passwordHash = await (await import("bcryptjs")).hash("pwd", 4);
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "disabled@test.dev",
      passwordHash,
      role: "STUDENT",
      schoolId: "s1",
      isPremium: false,
      credits: 0,
      verifiedAt: new Date(),
      disabledAt: new Date(),
      name: "User Disabled",
    });

    await expect(authorizeCredentials({ email: "disabled@test.dev", password: "pwd" })).rejects.toThrow(
      "Compte désactivé",
    );
  });

  it("throws when account is unverified", async () => {
    const passwordHash = await (await import("bcryptjs")).hash("pwd", 4);
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u2",
      email: "unverified@test.dev",
      passwordHash,
      role: "STUDENT",
      schoolId: "s1",
      isPremium: false,
      credits: 0,
      verifiedAt: null,
      disabledAt: null,
      name: "User Unverified",
    });

    await expect(
      authorizeCredentials({ email: "unverified@test.dev", password: "pwd" }),
    ).rejects.toThrow(
      "Compte non vérifié",
    );
  });

  it("returns null when password invalid", async () => {
    const passwordHash = await (await import("bcryptjs")).hash("pwd", 4);
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u3",
      email: "invalid@test.dev",
      passwordHash,
      role: "STUDENT",
      schoolId: "s1",
      isPremium: false,
      credits: 0,
      verifiedAt: new Date(),
      disabledAt: null,
      name: "User Invalid",
    });
    const result = await authorizeCredentials({ email: "invalid@test.dev", password: "wrong" });

    expect(result).toBeNull();
  });
});
