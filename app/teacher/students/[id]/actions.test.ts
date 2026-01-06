import { describe, expect, it, vi, beforeEach } from "vitest";

import { updateProgressAction, updateStudentProfileAction } from "./actions";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn() },
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

  it("throws on invalid learningStatus", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", schoolId: "s1", role: "TEACHER" },
    });
    prismaMock.user.findUnique.mockResolvedValue({ schoolId: "s1" });

    const form = new FormData();
    form.set("studentId", "clstu12345678901234567890");
    form.set("positionId", "clpos12345678901234567890");
    form.set("learningStatus", "UNKNOWN");

    await expect(updateProgressAction(form)).rejects.toThrow("Invalid form");
  });

  it("redirects when student from another school", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", schoolId: "s1", role: "TEACHER" },
    });
    prismaMock.user.findUnique.mockResolvedValue({ schoolId: "s2" });
    redirectMock.mockImplementation(() => {
      throw new Error("redirect");
    });

    const form = new FormData();
    form.set("studentId", "clstu12345678901234567890");
    form.set("positionId", "clpos12345678901234567890");
    form.set("learningStatus", "IN_PROGRESS");

    await expect(updateProgressAction(form)).rejects.toThrow("redirect");
    expect(redirectMock).toHaveBeenCalledWith("/access-denied");
  });

  it("updateStudentProfileAction rejects invalid phone", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", schoolId: "s1", role: "TEACHER" },
    });
    prismaMock.user.findUnique.mockResolvedValue({ schoolId: "s1" });

    const form = new FormData();
    form.set("studentId", "clstu12345678901234567890");
    form.set("firstName", "John");
    form.set("lastName", "Doe");
    form.set("phone", "abc");

    await expect(updateStudentProfileAction(form)).rejects.toThrow("Numéro WhatsApp invalide");
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("updateStudentProfileAction rejects invalid instagram", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", schoolId: "s1", role: "TEACHER" },
    });
    prismaMock.user.findUnique.mockResolvedValue({ schoolId: "s1" });

    const form = new FormData();
    form.set("studentId", "clstu12345678901234567890");
    form.set("instagramUsername", "a");

    await expect(updateStudentProfileAction(form)).rejects.toThrow("Username Instagram invalide");
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("updateStudentProfileAction updates profile and redirects", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", schoolId: "s1", role: "TEACHER" },
    });
    prismaMock.user.findUnique.mockResolvedValue({ schoolId: "s1" });
    prismaMock.user.update.mockResolvedValue({});
    redirectMock.mockImplementation(() => undefined);

    const form = new FormData();
    form.set("studentId", "clstu12345678901234567890");
    form.set("firstName", "John");
    form.set("lastName", "Doe");
    form.set("phone", "+33123456789");
    form.set("instagramUsername", "john_doe");

    await updateStudentProfileAction(form);

    expect(prismaMock.user.update).toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith("/teacher/students/clstu12345678901234567890");
    expect(redirectMock).toHaveBeenCalledWith("/teacher/students/clstu12345678901234567890");
  });
});
