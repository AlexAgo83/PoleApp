"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? process.env.CLOUDINARY_CLOUD_NAME;

type DayCourse = {
  id: string;
  title: string | null;
  date: string;
  durationMinutes: number | null;
  photoPublicId?: string | null;
  teacherName: string;
  studioName: string;
  discipline?: string | null;
  disciplineId?: string | null;
  past: boolean;
  myStatus: "CONFIRMED" | "WAITLIST" | null;
  waitlistRank: number | null;
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
  initialWeek: string;
  initialPrev: string;
  initialNext: string;
  initialDays: Day[];
  compact?: boolean;
  filters: {
    teacher?: string;
    studio?: string;
    discipline?: string;
    mine?: boolean;
    schools?: boolean;
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

export function WeekView({ initialWeek, initialPrev, initialNext, initialDays, filters, baseFrom, compact }: Props) {
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
      if (filters.discipline) params.set("discipline", filters.discipline);
      if (filters.mine) params.set("mine", "true");
      if (filters.schools) params.set("schools", "all");
      if (filters.q) params.set("q", filters.q);
      const res = await fetch(`/api/student/week-courses?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as {
        prevWeek: string;
        nextWeek: string;
        days: Day[];
        disciplineNameById?: Record<string, string>;
      };
      setWeek(target);
      setPrev(json.prevWeek);
      setNext(json.nextWeek);
      const nameById = json.disciplineNameById ?? {};
      setDays(
        (json.days ?? []).map((day) => ({
          ...day,
          courses: (day.courses ?? []).map((course) => ({
            ...course,
            discipline: course.disciplineId ? nameById[course.disciplineId] ?? course.discipline : course.discipline,
          })),
        }))
      );
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

  const weekLabel = useMemo(() => {
    const base = week || currentWeekKey;
    const start = new Date(`${base}T00:00:00`);
    if (Number.isNaN(start.getTime())) return "";
    return `Semaine du ${start.toLocaleDateString("fr-FR")}`;
  }, [week, currentWeekKey]);

  const containerClass = compact
    ? "rounded-2xl border border-white/0 bg-transparent p-0"
    : "p-0 border-0 bg-transparent shadow-none";

  return (
    <section className={containerClass}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
            {weekLabel || "Semaine en cours"}
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
      <div className="mt-4">
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 md:grid-cols-4 md:gap-3 lg:grid-cols-7">
          {days.map((day) => {
            const isToday =
              new Date(day.isoDate).toDateString() === new Date(new Date().setHours(0, 0, 0, 0)).toDateString();
            return (
              <div
                key={day.isoDate}
                className={`rounded-xl px-1 pb-1 text-sm text-slate-200 ${
                  isToday ? "border border-cyan-300/70 bg-cyan-500/10 shadow-sm shadow-cyan-500/30" : "border border-white/10 bg-white/5"
                }`}
              >
                <div className="mb-1 flex items-center justify-between text-xs font-semibold text-white pt-0.5 pl-0.5">
                  <span className="flex items-center gap-1 pl-1">
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
                  {day.courses.length > 0 && (
                    <span className="text-[11px] text-cyan-100 pr-1">{day.courses.length} cours</span>
                  )}
                </div>
                <div className="flex flex-col gap-1 md:gap-1.5">
                  {day.courses.map((course) => {
                    const isWaitlist = course.myStatus === "WAITLIST";
                    const isMineConfirmed = course.myStatus === "CONFIRMED";
                    const isVirtual = Boolean(course.isVirtual);
                    const badgeClass = course.past
                      ? "border border-blue-400/70 bg-blue-600/30 text-blue-50"
                      : isWaitlist
                      ? "border border-purple-300/70 bg-purple-500/25 text-purple-50"
                      : isMineConfirmed
                      ? "border border-amber-300/70 bg-amber-500/25 text-amber-50"
                      : "border border-white/20 bg-white/10 text-slate-300";
                    const statusLabel = course.past
                      ? "Passé"
                      : isWaitlist
                      ? "Attente"
                      : isMineConfirmed
                      ? "À venir"
                      : "Ouvert";
                    return (
                      <Link
                        key={course.id}
                        href={`/student/courses/${course.id}?from=${encodeURIComponent(baseFrom)}`}
                        className={`relative block w-full overflow-hidden rounded-md border px-0.5 py-0.5 text-[11px] transition hover:border-cyan-300/70 hover:bg-white/15 md:rounded-lg md:px-1 md:py-1 ${
                          isVirtual
                            ? course.past
                              ? "border-amber-200/50 bg-amber-500/10 text-amber-50 opacity-80"
                              : "border-amber-300/70 bg-amber-500/20 text-white"
                            : course.past
                            ? "border-white/15 bg-slate-800/60 text-slate-300 opacity-70 line-through"
                            : "border-white/10 bg-white/10 text-white"
                        }`}
                        title={`Durée : ${formatDuration(course.durationMinutes ?? 60)}`}
                          style={
                            course.photoPublicId && CLOUD_NAME
                              ? {
                                  backgroundImage: `linear-gradient(135deg, rgba(12,18,40,0.82), rgba(26,16,60,0.82)), linear-gradient(135deg, rgba(10,15,30,0.45), rgba(15,25,45,0.38)), url(https://res.cloudinary.com/${CLOUD_NAME}/image/upload/c_fill,g_auto,f_auto,q_auto,w_640,h_360/${course.photoPublicId})`,
                                  backgroundBlendMode: "normal, soft-light",
                                  backgroundSize: "cover",
                                  backgroundPosition: "center",
                                }
                              : undefined
                        }
                      >
                        <div
                          className="space-y-0.5"
                          style={{ textShadow: "0 2px 14px rgba(0,0,0,0.75)" }}
                        >
                          <p className="text-[9px] text-cyan-100 whitespace-nowrap">
                            {new Date(course.date).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            })}{" "}
                            - {formatDuration(course.durationMinutes ?? 60)}
                          </p>
                          <p className="text-[11px] font-semibold text-white leading-snug break-words">
                            {course.title ?? "Cours"}
                          </p>
                          <p className="text-[10px] text-cyan-100 break-words">
                            {course.teacherName}
                          </p>
                          <p className="text-[10px] text-slate-200 break-words">
                            {course.studioName}
                          </p>
                          {course.discipline && (
                            <p className="text-[10px] text-cyan-50/90 break-words">
                              {course.discipline}
                            </p>
                          )}
                          {course.isVirtual && (
                            <p
                              className="text-[12px] text-amber-100"
                              title="Occurrence programmée · positions à définir"
                              aria-label="Occurrence programmée"
                            >
                              🗓️
                            </p>
                          )}
                        </div>
                        <div className="mt-2 flex justify-end">
                          <span
                            className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badgeClass}`}
                            title={
                              isWaitlist
                                ? "Liste d'attente"
                                : isMineConfirmed
                                ? course.past
                                  ? "Cours déjà suivi"
                                  : "Inscrit"
                                : "Non inscrit"
                            }
                          >
                            {isWaitlist && course.waitlistRank ? `#${course.waitlistRank}` : statusLabel}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {isPending && <div className="mt-2 text-center text-xs text-slate-300">Chargement…</div>}
    </section>
  );
}
