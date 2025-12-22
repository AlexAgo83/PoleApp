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
};

type Day = {
  isoDate: string;
  label: string;
  day: number;
  isPast: boolean;
  courses: DayCourse[];
};

type Props = {
  initialWeek: string;
  initialPrev: string;
  initialNext: string;
  initialDays: Day[];
  filters: {
    teacher?: string;
    studio?: string;
    q?: string;
  };
  baseFrom: string;
};

function formatDuration(minutes: number) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0) {
    return `${hrs}h${mins.toString().padStart(2, "0")}`;
  }
  return `${mins} min`;
}

export function WeekView({ initialWeek, initialPrev, initialNext, initialDays, filters, baseFrom }: Props) {
  const [days, setDays] = useState<Day[]>(initialDays);
  const [week, setWeek] = useState(initialWeek);
  const [prev, setPrev] = useState(initialPrev);
  const [next, setNext] = useState(initialNext);
  const [isPending, startTransition] = useTransition();

  const currentWeekKey = useMemo(() => {
    const d = new Date();
    const start = new Date(d);
    const dayOffset = start.getDay() === 0 ? 6 : start.getDay() - 1;
    start.setDate(start.getDate() - dayOffset);
    return `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  }, []);

  const fetchWeek = (target: string) => {
    startTransition(async () => {
      const params = new URLSearchParams();
      params.set("week", target);
      if (filters.teacher) params.set("teacher", filters.teacher);
      if (filters.studio) params.set("studio", filters.studio);
      if (filters.q) params.set("q", filters.q);
      const res = await fetch(`/api/teacher/week-courses?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { prevWeek: string; nextWeek: string; days: Day[] };
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

  return (
    <section className="panel p-6">
      <div className="flex items-center justify-between text-lg font-semibold text-white">
        <span>Vue semaine</span>
      </div>
      <div className="mt-3 grid gap-1.5 sm:gap-2 md:grid-cols-7 md:gap-3">
        {days.map((day) => {
          const hideOnMobile = day.courses.length === 0 ? "hidden md:block" : "";
          return (
            <div
              key={day.isoDate}
              className={`rounded-xl border border-white/10 bg-white/5 p-2 text-sm text-slate-200 ${hideOnMobile}`}
            >
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-white">
                <span className="flex items-center gap-1">
                  <span className={`text-[10px] uppercase tracking-wide md:text-xs ${day.isPast ? "text-slate-400" : "text-cyan-100"}`}>
                    {day.label}
                  </span>
                  <span className={day.isPast ? "text-slate-400" : undefined}>{day.day}</span>
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
                      href={`/app/teacher/courses/${course.id}?from=${encodeURIComponent(baseFrom)}`}
                      className={`relative rounded-md border px-2 py-2 text-[11px] transition hover:border-cyan-300/70 hover:bg-white/15 md:rounded-lg md:px-2.5 md:py-2 ${
                        course.past
                          ? "border-white/15 bg-slate-800/60 text-slate-300 opacity-70 line-through"
                          : "border-white/10 bg-white/10 text-white"
                      }`}
                      title={`Durée : ${formatDuration(course.durationMinutes ?? 60)}`}
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
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm text-white">
        <form onSubmit={handlePrev} className="inline-flex">
          <input type="hidden" name="week" value={prev} />
          <button
            type="submit"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-semibold transition hover:border-cyan-400/70 hover:bg-white/10 disabled:opacity-60"
            disabled={isPending}
          >
            ← Semaine précédente
          </button>
        </form>
        <form onSubmit={handleReset} className="inline-flex">
          <button
            type="submit"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-semibold transition hover:border-cyan-400/70 hover:bg-white/10 disabled:opacity-60"
            disabled={isPending || week === currentWeekKey}
          >
            Semaine actuelle
          </button>
        </form>
        <form onSubmit={handleNext} className="inline-flex">
          <input type="hidden" name="week" value={next} />
          <button
            type="submit"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-semibold transition hover:border-cyan-400/70 hover:bg-white/10 disabled:opacity-60"
            disabled={isPending}
          >
            Semaine suivante →
          </button>
        </form>
      </div>
      {isPending && (
        <div className="mt-2 text-center text-xs text-slate-300">Chargement…</div>
      )}
    </section>
  );
}
