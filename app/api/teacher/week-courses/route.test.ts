import { describe, expect, it, vi, beforeEach } from "vitest";

import { GET, revalidate } from "./route";

const prismaMock = vi.hoisted(() => ({
  course: { findMany: vi.fn() },
  discipline: { findMany: vi.fn() },
}));
const getServerSessionMock = vi.fn();

vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

describe("GET /api/teacher/week-courses", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (global.Date as any) = Date;
  });

  it("exports revalidate=60", () => {
    expect(revalidate).toBe(60);
  });

  it("returns 403 when unauthorized", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/teacher/week-courses"));
    expect(res.status).toBe(403);
  });

  it("returns days for authorized teacher", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "u1", role: "TEACHER", schoolId: "s1" },
    });
    prismaMock.course.findMany.mockResolvedValue([
      {
        id: "c1",
        title: "Cours",
        photoPublicId: null,
        disciplineId: "d1",
        disciplineRef: { disabledAt: null },
        date: new Date("2024-01-01T10:00:00Z"),
        durationMinutes: 60,
        isVirtual: false,
        teacher: { name: "Prof", email: "p@example.com", disabledAt: null },
        studio: { name: "Studio", disabledAt: null },
        _count: { positions: 0 },
      },
    ]);
    prismaMock.discipline.findMany.mockResolvedValue([{ id: "d1", name: "Pole" }]);

    const res = await GET(new Request("http://localhost/api/teacher/week-courses?week=2024-01-01"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.days).toHaveLength(7);
    expect(data.disciplineNameById).toMatchObject({ d1: "Pole" });
  });
});
