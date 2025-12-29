"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { MonthNav } from "@/components/MonthNav";

type MonthCourse = {
  id: string;
  title: string | null;
  date: string;
  durationMinutes: number | null;
  teacherName: string;
  studioName: string;
  past?: boolean;
  isVirtual?: boolean;
  positionsCount?: number;
};

type MonthCell = {
  day?: number;
  isoDate?: string;
  courses: MonthCourse[];
};

type Filters = {
  teacher?: string;
  studio?: string;
  discipline?: string;
  level?: string;
  q?: string;
  from?: string;
  to?: string;
};

type Props = {
  initialMonth: string;
  currentMonth: string;
  initialPrev: string;
  initialNext: string;
  initialCells: MonthCell[];
  hasCourses: boolean;
  filters: Filters;
  baseFrom: string;
};

function formatDuration(minutes: number) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) return `${hrs}h${mins.toString().padStart(2, "0")}`;
  return `${mins} min`;
}

function isPastCourse(courseDate: string, durationMinutes?: number | null) {
  const endMs = new Date(courseDate).getTime() + (durationMinutes ?? 60) * 60_000;
  return endMs < Date.now();
}

export function MonthView({
  initialMonth,
  currentMonth,
  initialPrev,
  initialNext,
  initialCells,
  hasCourses,
  filters,
  baseFrom,
}: Props) {
  const [month, setMonth] = useState(initialMonth);
  const [prev, setPrev] = useState(initialPrev);
  const [next, setNext] = useState(initialNext);
  const [cells, setCells] = useState<MonthCell[]>(initialCells);
  const [hasAnyCourse, setHasAnyCourse] = useState(hasCourses);
  const [isPending, startTransition] = useTransition();
  const monthLabel = new Date(`${month}-01T00:00:00`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  const fetchMonth = (target: string) => {
    startTransition(async () => {
      const params = new URLSearchParams();
      params.set("month", target);
      if (filters.teacher) params.set("teacher", filters.teacher);
      if (filters.studio) params.set("studio", filters.studio);
      if (filters.discipline) params.set("discipline", filters.discipline);
      if (filters.level) params.set("level", filters.level);
      if (filters.q) params.set("q", filters.q);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      const res = await fetch(`/api/teacher/month-courses?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        monthValue: string;
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

  const handleSelect = (value: string) => {
    fetchMonth(value);
  };

  return (
    <section className="panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">Vue mensuelle</h3>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            {monthLabel}
          </span>
          <MonthNav
            prev={prev}
            current={currentMonth}
            next={next}
            onSelect={handleSelect}
            loading={isPending}
          />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-1.5 text-sm text-slate-200 sm:grid-cols-2 sm:gap-2 md:grid-cols-3 lg:grid-cols-7">
        {cells.map((cell, idx) => {
          const weekDayIndex = (idx % 7) + 1;
          const label = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"][(weekDayIndex - 1) % 7];
          const cellDate = cell.isoDate
            ? new Date(cell.isoDate)
            : cell.day
              ? new Date(`${month}-${String(cell.day).padStart(2, "0")}T00:00:00`)
              : null;
          const isPastDay = cellDate ? cellDate < new Date(new Date().setHours(0, 0, 0, 0)) : false;
          const isToday = cellDate?.toDateString() === new Date(new Date().setHours(0, 0, 0, 0)).toDateString();
          const hideOnMobileMonth = !cell.courses || cell.courses.length === 0 ? "hidden sm:block" : "";

          return (
            <div
              key={`${month}-${idx}`}
              className={`rounded-xl p-2 text-left ${hideOnMobileMonth} ${
                !cell.courses || cell.courses.length === 0 ? "min-h-[40px] md:min-h-[80px]" : "min-h-[80px]"
              } ${
                isToday
                  ? "border border-cyan-300/70 bg-cyan-500/10 shadow-sm shadow-cyan-500/30"
                  : "border border-white/10 bg-white/5"
              }`}
            >
              <div className="mb-1 flex items-center justify-between text-xs font-semibold text-white">
                <span className="flex items-center gap-1">
                  <span
                    className={`text-[10px] uppercase tracking-wide md:text-xs ${
                      isPastDay && !isToday ? "text-slate-400" : "text-cyan-100"
                    } ${isToday ? "font-semibold" : ""}`}
                  >
                    {label}
                  </span>
                  <span className={`${isPastDay && !isToday ? "text-slate-400" : ""} ${isToday ? "font-bold text-white" : ""}`}>
                    {cell.day ?? "—"}
                  </span>
                </span>
                <span className="text-[11px] text-cyan-100">{(cell.courses?.length ?? 0)} cours</span>
              </div>
              {cell.courses &&
                cell.courses.slice(0, 3).map((course) => {
                  const past = course.past ?? isPastCourse(course.date, course.durationMinutes);
                  const statusLabel = past ? "Passé" : "À venir";
                  const badgeClass = past
                    ? "border border-blue-400/60 bg-blue-500/20 text-blue-50"
                    : "border border-emerald-400/60 bg-emerald-500/20 text-emerald-50";
                  return (
                    <Link
                      key={course.id}
                      href={`/app/teacher/courses/${course.id}?from=${encodeURIComponent(baseFrom)}`}
                      className={`relative mt-1 block w-full rounded-md border px-2 py-2 text-[11px] transition hover:border-cyan-300/60 hover:bg-white/15 md:rounded-lg md:px-2.5 md:py-2 ${
                        course.isVirtual
                          ? past
                            ? "border-amber-200/50 bg-amber-500/10 text-amber-50 opacity-80"
                            : "border-amber-300/70 bg-amber-500/20 text-white"
                          : past
                          ? "border-white/10 bg-slate-800/60 text-slate-300 opacity-70 line-through"
                          : "border-white/10 bg-white/10 text-white"
                      }`}
                    >
                      <div className="space-y-0.5 overflow-hidden pr-6">
                        <p className="text-[9px] text-cyan-100 whitespace-nowrap">
                          {new Date(course.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", hour12: false })}{" "}
                          - {formatDuration(course.durationMinutes ?? 60)}
                        </p>
                        <p className="truncate text-[11px] font-semibold text-white">
                          {course.title ?? "Cours"}
                        </p>
                        <p className="truncate text-[10px] text-cyan-100">
                          {course.teacherName}
                        </p>
                        <p className="truncate text-[10px] text-slate-200">
                          {course.studioName}
                        </p>
                          {course.isVirtual && (
                            <p
                              className="truncate text-[12px] text-amber-100"
                              title="Occurrence programmée · positions à définir"
                              aria-label="Occurrence programmée"
                            >
                              🗓️
                            </p>
                          )}
                      </div>
                      <div className="absolute bottom-1 right-1 flex flex-col items-end gap-1">
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              {cell.courses && cell.courses.length > 3 && (
                <div className="mt-1 text-[11px] text-slate-300">
                  +{cell.courses.length - 3} autres
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!hasAnyCourse && (
        <p className="mt-4 text-sm text-slate-200">Aucun cours prévu pour ce mois.</p>
      )}
    </section>
  );
}
