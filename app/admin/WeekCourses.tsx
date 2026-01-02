"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";

type DayCourse = {
  id: string;
  title: string | null;
  date: string;
  durationMinutes: number | null;
  teacherName: string;
  studioName: string;
  past: boolean;
  isVirtual?: boolean;
  positionsCount?: number;
};

type Day = {
  isoDate: string;
  label: string;
  day: number;
  isPast: boolean;
  courses: DayCourse[];
};

type Props = {
  initialWeek: string | null;
  initialPrev: string;
  initialNext: string;
  initialDays: Day[];
  compact?: boolean;
};

function formatDuration(minutes: number) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) {
    return `${hrs}h${mins.toString().padStart(2, "0")}`;
  }
  return `${mins} min`;
}

export function WeekCourses({ initialWeek, initialPrev, initialNext, initialDays, compact }: Props) {
  const [days, setDays] = useState<Day[]>(initialDays);
  const [week, setWeek] = useState<string | null>(initialWeek);
  const [prev, setPrev] = useState(initialPrev);
  const [next, setNext] = useState(initialNext);
  const [isPending, startTransition] = useTransition();
  const totalCourses = useMemo(() => days.reduce((acc, d) => acc + d.courses.length, 0), [days]);

  const currentWeekKey = useMemo(() => {
    const d = new Date();
    const start = new Date(d);
    const dayOffset = start.getDay() === 0 ? 6 : start.getDay() - 1;
    start.setDate(start.getDate() - dayOffset);
    return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  }, []);

  const fetchWeek = (target: string) => {
    startTransition(async () => {
      const url = `/api/admin/week-courses?week=${encodeURIComponent(target)}`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as {
        prevWeek: string;
        nextWeek: string;
        days: Day[];
      };
      setWeek(target);
      setPrev(json.prevWeek);
      setNext(json.nextWeek);
      setDays(json.days);
    });
  };

  const handlePrev = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetchWeek(prev);
  };
  const handleNext = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetchWeek(next);
  };
  const handleReset = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetchWeek(currentWeekKey);
  };

  const label = useMemo(() => {
    if (!week) return "Semaine en cours";
    const d = new Date(`${week}T00:00:00`);
    return `Semaine du ${d.toLocaleDateString("fr-FR")}`;
  }, [week]);

  const containerClass = compact ? "rounded-2xl border border-white/0 bg-transparent p-0" : "panel p-6";

  return (
    <section className={containerClass}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            {label}
          </span>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2 text-sm text-white">
        <form onSubmit={handlePrev} className="inline-flex">
          <input type="hidden" name="week" value={prev} />
          <button
            type="submit"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-semibold transition hover:border-cyan-400/70 hover:bg-white/10 disabled:opacity-60"
            disabled={isPending}
          >
            ←
          </button>
        </form>
        <form onSubmit={handleReset} className="inline-flex">
          <button
            type="submit"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-semibold transition hover:border-cyan-400/70 hover:bg-white/10 disabled:opacity-60"
            disabled={isPending || week === currentWeekKey}
          >
            Actuelle
          </button>
        </form>
        <form onSubmit={handleNext} className="inline-flex">
          <input type="hidden" name="week" value={next} />
          <button
            type="submit"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-semibold transition hover:border-cyan-400/70 hover:bg-white/10 disabled:opacity-60"
            disabled={isPending}
          >
            →
          </button>
        </form>
      </div>
      </div>
      <div className="mt-3 grid gap-1.5 sm:gap-2 md:grid-cols-7 md:gap-3">
        {days.map((day) => {
          const isToday =
            new Date(day.isoDate).toDateString() === new Date(new Date().setHours(0, 0, 0, 0)).toDateString();
          const hideOnMobile = day.courses.length === 0 ? "hidden md:block" : "";
          return (
            <div
              key={day.isoDate}
              className={`rounded-xl p-2 text-sm text-slate-200 ${
                isToday ? "border border-cyan-300/70 bg-cyan-500/10 shadow-sm shadow-cyan-500/30" : "border border-white/10 bg-white/5"
              } ${hideOnMobile}`}
            >
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-white pt-0.5 pl-0.5">
                <span className="flex items-center gap-1">
                  <span
                    className={`text-[10px] uppercase tracking-wide md:text-xs ${
                      day.isPast && !isToday ? "text-slate-400" : "text-cyan-100"
                    } ${isToday ? "font-semibold" : ""}`}
                  >
                    {day.label}
                  </span>
                  <span className={`${day.isPast && !isToday ? "text-slate-400" : ""} ${isToday ? "font-bold text-white" : ""}`}>
                    {day.day}
                  </span>
                </span>
                <span className="text-[11px] text-cyan-100">{day.courses.length} cours</span>
              </div>
              <div className="flex flex-col gap-1.5 md:gap-2">
                {day.courses.map((course) => {
                  const badgeClass = course.past
                    ? "border border-blue-400/60 bg-blue-500/20 text-blue-50"
                    : "border border-emerald-400/60 bg-emerald-500/20 text-emerald-50";
                  const statusLabel = course.past ? "Passé" : "À venir";
                  return (
                    <Link
                      key={course.id}
                    href={`/teacher/courses/${course.id}?from=/admin`}
                    className={`relative rounded-md border px-2 py-2 text-[11px] transition hover:border-cyan-300/70 hover:bg-white/15 md:rounded-lg md:px-2.5 md:py-2 ${
                      course.isVirtual
                        ? course.past
                          ? "border-amber-200/50 bg-amber-500/10 text-amber-50 opacity-80"
                            : "border-amber-300/70 bg-amber-500/20 text-white"
                          : course.past
                          ? "border-white/15 bg-slate-800/60 text-slate-300 opacity-70 line-through"
                          : "border-white/10 bg-white/10 text-white"
                    }`}
                    title={`Durée : ${formatDuration(course.durationMinutes ?? 60)}`}
                  >
                      <div
                        className="space-y-0.5 overflow-hidden pr-6"
                        style={{ textShadow: "0 2px 14px rgba(0,0,0,0.75)" }}
                      >
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
                      <span
                        className={`absolute bottom-1 right-1 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}
                      >
                        {statusLabel}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
            );
          })}
      </div>
      {isPending && (
        <div className="mt-2 text-center text-xs text-slate-300">Chargement…</div>
      )}
    </section>
  );
}
