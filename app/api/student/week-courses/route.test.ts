import { describe, expect, it, vi, beforeEach } from "vitest";

import { GET, revalidate } from "./route";

const prismaMock = vi.hoisted(() => ({
  course: { findMany: vi.fn() },
  courseAttendance: { findMany: vi.fn() },
  discipline: { findMany: vi.fn() },
}));
const getServerSessionMock = vi.fn();

vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => getServerSessionMock(...args),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

describe("GET /api/student/week-courses", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("exports revalidate=60", () => {
    expect(revalidate).toBe(60);
  });

  it("returns 403 when unauthorized", async () => {
    getServerSessionMock.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/student/week-courses"));
    expect(res.status).toBe(403);
  });

  it("returns days for authorized student", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "stu1", role: "STUDENT", schoolId: "s1" },
    });
    prismaMock.courseAttendance.findMany.mockResolvedValue([]);
    prismaMock.course.findMany.mockResolvedValue([
      {
        id: "c1",
        title: "Cours",
        photoPublicId: null,
        disciplineId: "d1",
        date: new Date("2024-01-01T10:00:00Z"),
        durationMinutes: 60,
        isVirtual: false,
        _count: { positions: 0 },
        teacher: { name: "Prof", email: "p@example.com" },
        studio: { name: "Studio" },
        attendances: [],
      },
    ]);
    prismaMock.discipline.findMany.mockResolvedValue([{ id: "d1", name: "Pole" }]);

    const res = await GET(new Request("http://localhost/api/student/week-courses?week=2024-01-01"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.days).toHaveLength(7);
    expect(data.disciplineNameById).toMatchObject({ d1: "Pole" });
  });

  it("applies school filter and discipline multi-filter", async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: "stu1", role: "STUDENT", schoolId: "s1" },
    });
    prismaMock.courseAttendance.findMany.mockResolvedValue([]);
    prismaMock.course.findMany.mockResolvedValue([]);
    prismaMock.discipline.findMany.mockResolvedValue([]);

    await GET(new Request("http://localhost/api/student/week-courses?discipline=a,b"));

    expect(prismaMock.course.findMany).toHaveBeenCalledTimes(1);
    const where = prismaMock.course.findMany.mock.calls[0][0].where;
    expect(where.schoolId).toEqual("s1");
    expect(where.OR).toEqual([
      { disciplineId: { in: ["a", "b"] } },
      { discipline: { in: ["a", "b"], mode: "insensitive" } },
    ]);
    expect(where.date.gte instanceof Date).toBe(true);
    expect(where.date.lte instanceof Date).toBe(true);
  });
});
