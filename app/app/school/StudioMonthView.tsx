"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

type Course = {
  id: string;
  courseId?: string;
  title: string | null;
  date: string | Date;
  durationMinutes: number | null;
  teacherName?: string | null;
  studioName?: string | null;
  myStatus?: "CONFIRMED" | "WAITLIST" | null;
  waitlistRank?: number | null;
  past?: boolean;
};

type MonthCell = {
  day?: number;
  courses: Course[];
};

type Filters = {
  teacher?: string;
  studio: string;
  discipline?: string;
  q?: string;
};

type Props = {
  initialMonth: string;
  initialPrev: string;
  initialNext: string;
  initialCells: MonthCell[];
  hasCourses: boolean;
  baseFrom: string;
  courseBasePath: string;
  role: "STUDENT" | "TEACHER" | "SCHOOL_ADMIN";
  filters: Filters;
};

function formatDuration(minutes: number) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) return `${hrs}h${mins.toString().padStart(2, "0")}`;
  return `${mins} min`;
}

export function StudioMonthView({
  initialMonth,
  initialPrev,
  initialNext,
  initialCells,
  hasCourses,
  baseFrom,
  courseBasePath,
  role,
  filters,
}: Props) {
  const [month, setMonth] = useState(initialMonth);
  const [prev, setPrev] = useState(initialPrev);
  const [next, setNext] = useState(initialNext);
  const [cells, setCells] = useState<MonthCell[]>(initialCells);
  const [hasAnyCourse, setHasAnyCourse] = useState(hasCourses);
  const [isPending, startTransition] = useTransition();

  const monthLabel = useMemo(
    () => new Date(`${month}-01T00:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    [month]
  );
  const totalCourses = useMemo(
    () => cells.reduce((acc, cell) => acc + (cell.courses?.length ?? 0), 0),
    [cells]
  );

  const fetchMonth = (target: string) => {
    startTransition(async () => {
      const params = new URLSearchParams();
      params.set("month", target);
      params.set("studio", filters.studio);
      if (filters.teacher) params.set("teacher", filters.teacher);
      if (filters.discipline) params.set("discipline", filters.discipline);
      if (filters.q) params.set("q", filters.q);

      const endpoint =
        role === "STUDENT" ? "/api/student/month-courses" : "/api/teacher/month-courses";
      const res = await fetch(`${endpoint}?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        monthValue: string;
        currentMonth: string;
        prevMonth: string;
        nextMonth: string;
        cells: MonthCell[];
        hasCourses: boolean;
      };
      setMonth(data.monthValue ?? target);
      setPrev(data.prevMonth);
      setNext(data.nextMonth);
      setCells(data.cells ?? []);
      setHasAnyCourse(Boolean(data.hasCourses));
    });
  };

  const handlePrev = () => fetchMonth(prev);
  const handleNext = () => fetchMonth(next);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-semibold text-white">
            {monthLabel}
          </span>
          <span className="text-slate-200">{totalCourses} cours sur le mois affiché</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            onClick={handlePrev}
            disabled={isPending}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-semibold text-white transition hover:border-cyan-300/60 hover:bg-white/10 disabled:opacity-60"
          >
            ← Mois précédent
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={isPending}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-semibold text-white transition hover:border-cyan-300/60 hover:bg-white/10 disabled:opacity-60"
          >
            Mois suivant →
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
        {cells.map((cell, idx) => {
          const dayLabel = cell.day ? String(cell.day) : "";
          const dateObj = cell.day ? new Date(`${month}-${String(cell.day).padStart(2, "0")}T00:00:00`) : null;
          const isPastDay = dateObj ? dateObj < new Date(new Date().setHours(0, 0, 0, 0)) : false;
          const weekdayLabel = dateObj
            ? dateObj.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")
            : "";

          return (
            <div
              key={`${month}-${cell.day ?? idx}`}
              className="rounded-xl border border-white/10 bg-white/5 p-2 text-left"
            >
              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-white">
                <span className="flex items-center gap-1">
                  <span className={`text-[10px] uppercase tracking-wide md:text-xs ${isPastDay ? "text-slate-400" : "text-cyan-100"}`}>
                    {weekdayLabel}
                  </span>
                  <span className={isPastDay ? "text-slate-400" : undefined}>{dayLabel}</span>
                </span>
                <span className="text-[11px] text-cyan-100">
                  {(cell.courses?.length ?? 0)} cours
                </span>
              </div>
              {cell.courses && cell.courses.length > 0 ? (
                <>
                  {cell.courses.slice(0, 3).map((course) => {
                    const past =
                      typeof course.past === "boolean"
                        ? course.past
                        : new Date(course.date).getTime() + (course.durationMinutes ?? 60) * 60_000 < Date.now();
                    const courseDate = new Date(course.date);
                    const courseId = course.courseId ?? course.id;

                    return (
                      <Link
                        key={`${course.id}-${courseId}`}
                        href={`${courseBasePath}/${courseId}?from=${encodeURIComponent(baseFrom)}`}
                        className={`relative mt-1 flex items-start gap-2 rounded-lg border px-2 py-2 text-[11px] transition hover:border-cyan-300/60 hover:bg-white/10 ${
                          past ? "border-white/10 bg-slate-800/60 text-slate-300 opacity-80" : "border-white/10 bg-white/10 text-white"
                        }`}
                      >
                        <div className="flex-1 space-y-0.5 overflow-hidden pr-4">
                          <p className="text-[10px] text-cyan-100">
                            {courseDate.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false })} ·{" "}
                            {course.durationMinutes ? formatDuration(course.durationMinutes) : "60 min"}
                          </p>
                          <p className="truncate text-[11px] font-semibold text-white">
                            {course.title ?? "Cours"}
                          </p>
                          <p className="truncate text-[10px] text-cyan-100">
                            {course.teacherName ?? "Professeur"}
                          </p>
                          <p className="truncate text-[10px] text-slate-200">
                            {course.studioName ?? "Studio"}
                          </p>
                        </div>
                        {course.myStatus ? (
                          <span
                            className="absolute bottom-1 right-1 inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white"
                            title={course.myStatus === "WAITLIST" ? "Liste d'attente" : "Inscrit"}
                          >
                            {course.waitlistRank ? `#${course.waitlistRank}` : course.myStatus === "WAITLIST" ? "Attente" : "Inscrit"}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                  {cell.courses.length > 3 && (
                    <p className="mt-1 text-[10px] text-slate-300">+{cell.courses.length - 3} autres</p>
                  )}
                </>
              ) : (
                <p className="text-[11px] text-slate-400">Aucun cours</p>
              )}
            </div>
          );
        })}
      </div>
      {!hasAnyCourse && (
        <p className="text-sm text-slate-200">Aucun cours prévu pour ce mois.</p>
      )}
    </div>
  );
}
