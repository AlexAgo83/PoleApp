import { describe, expect, it, vi, beforeEach } from "vitest";

import { updateProgressAction } from "./actions";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  studentPositionProgress: { upsert: vi.fn() },
}));
const getServerSessionMock = vi.fn();
const redirectMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}));
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => redirectMock(...args),
}));
vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePathMock(...args),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

describe("updateProgressAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("redirects to access denied when no session", async () => {
    getServerSessionMock.mockResolvedValue(null);
    redirectMock.mockImplementation(() => {
      throw new Error("redirect");
    });
    const form = new FormData();
    form.set("studentId", "clstu12345678901234567890");
    form.set("positionId", "clpos12345678901234567890");
    form.set("learningStatus", "LEARNING");

    await expect(updateProgressAction(form)).rejects.toThrow("redirect");
    expect(redirectMock).toHaveBeenCalledWith("/access-denied");
  });

  it("updates progress and revalidates path", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", schoolId: "s1", role: "TEACHER" },
    });
    prismaMock.user.findUnique.mockResolvedValue({ schoolId: "s1" });
    prismaMock.studentPositionProgress.upsert.mockResolvedValue({
      learningStatus: "IN_PROGRESS",
      comment: "ok",
    });

    const form = new FormData();
    form.set("studentId", "clstu12345678901234567890");
    form.set("positionId", "clpos12345678901234567890");
    form.set("learningStatus", "IN_PROGRESS");
    form.set("comment", "ok");

    const res = await updateProgressAction(form);

    expect(res).toEqual({
      ok: true,
      progress: { learningStatus: "IN_PROGRESS", comment: "ok" },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/teacher/students/clstu12345678901234567890");
  });
});
