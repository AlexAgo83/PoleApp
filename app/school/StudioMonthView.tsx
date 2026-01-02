"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

type Course = {
  id: string;
  courseId?: string;
  title: string | null;
  date: string | Date;
  durationMinutes: number | null;
  photoPublicId?: string | null;
  teacherName?: string | null;
  studioName?: string | null;
  isVirtual?: boolean;
  positionsCount?: number | null;
  myStatus?: "CONFIRMED" | "WAITLIST" | null;
  waitlistRank?: number | null;
  past?: boolean;
};

type MonthCell = {
  day?: number;
  isoDate?: string;
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

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? process.env.CLOUDINARY_CLOUD_NAME;

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
  const handleReset = () => {
    const current = new Date();
    const key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
    fetchMonth(key);
  };

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
            ←
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={isPending}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-semibold text-white transition hover:border-cyan-300/60 hover:bg-white/10 disabled:opacity-60"
          >
            Actuel
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={isPending}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-semibold text-white transition hover:border-cyan-300/60 hover:bg-white/10 disabled:opacity-60"
          >
            →
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
        {cells.map((cell, idx) => {
          const dayLabel = cell.day ? String(cell.day) : "";
          const dateObj = cell.isoDate
            ? new Date(cell.isoDate)
            : cell.day
              ? new Date(`${month}-${String(cell.day).padStart(2, "0")}T00:00:00`)
              : null;
          const isPastDay = dateObj ? dateObj < new Date(new Date().setHours(0, 0, 0, 0)) : false;
          const isToday = dateObj?.toDateString() === new Date(new Date().setHours(0, 0, 0, 0)).toDateString();
          const weekdayLabel = dateObj
            ? dateObj.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")
            : "";

          const key = cell.day ? `${month}-${cell.day}` : `${month}-empty-${idx}`;
          return (
            <div
              key={key}
              className={`rounded-xl p-2 text-left ${
                isToday ? "border border-cyan-300/70 bg-cyan-500/10 shadow-sm shadow-cyan-500/30" : "border border-white/10 bg-white/5"
              }`}
            >
              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-white">
                <span className="flex items-center gap-1">
                  <span
                    className={`text-[10px] uppercase tracking-wide md:text-xs ${
                      isPastDay && !isToday ? "text-slate-400" : "text-cyan-100"
                    } ${isToday ? "font-semibold" : ""}`}
                  >
                    {weekdayLabel}
                  </span>
                  <span className={`${isPastDay && !isToday ? "text-slate-400" : ""} ${isToday ? "font-bold text-white" : ""}`}>
                    {dayLabel}
                  </span>
                </span>
                {cell.courses && cell.courses.length > 0 && (
                  <span className="text-[11px] text-cyan-100">
                    {cell.courses.length} cours
                  </span>
                )}
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
                    const isVirtual = Boolean(course.isVirtual);

                    return (
                      <Link
                        key={`${course.id}-${courseId}`}
                        href={`${courseBasePath}/${courseId}?from=${encodeURIComponent(baseFrom)}`}
                        className={`relative mt-1 flex items-start gap-2 rounded-lg border px-2 py-2 text-[11px] transition hover:border-cyan-300/60 hover:bg-white/10 ${
                          isVirtual
                            ? "border-amber-300/70 bg-amber-500/20 text-white"
                            : past
                            ? "border-white/10 bg-slate-800/60 text-slate-300 opacity-80"
                            : "border-white/10 bg-white/10 text-white"
                        }`}
                        style={
                          course.photoPublicId && CLOUD_NAME
                            ? {
                                backgroundImage: `linear-gradient(135deg, rgba(10,15,30,0.25), rgba(15,25,45,0.22)), url(https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,g_auto,f_auto,q_auto,e_blur:600,w_640,h_360/${course.photoPublicId})`,
                                backgroundBlendMode: "soft-light",
                                backgroundColor: "rgba(8,12,20,0.35)",
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }
                            : undefined
                        }
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
                          {isVirtual && (
                            <p className="text-[12px] text-amber-100" title="Occurrence programmée · positions à définir">
                              🗓️
                            </p>
                          )}
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
