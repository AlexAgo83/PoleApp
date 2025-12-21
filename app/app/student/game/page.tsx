import { GameMode } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { GameClient } from "./GameClient";
import { buildGameQuestions, GameQuestion } from "./logic";

type SearchParams = Promise<{ mode?: string }>;

type ModeMeta = {
  id: GameMode;
  title: string;
  description: string;
  questions: number;
};

const MODES: ModeMeta[] = [
  {
    id: "PHOTO_NAME",
    title: "Photo → Nom",
    description: "Devine la position depuis la photo.",
    questions: 10,
  },
  {
    id: "NAME_TYPE",
    title: "Nom → Type",
    description: "Associe la catégorie (Spin, Trick...).",
    questions: 10,
  },
  {
    id: "NAME_LEVEL",
    title: "Nom → Niveau",
    description: "Détermine le niveau requis.",
    questions: 10,
  },
  {
    id: "NAME_GRIPS",
    title: "Nom → Grips",
    description: "Trouve le grip principal (avec distracteurs).",
    questions: 10,
  },
  {
    id: "DESCRIPTION_NAME",
    title: "Description → Nom",
    description: "Retrouve le nom depuis l’intro/description.",
    questions: 10,
  },
  {
    id: "BLITZ_MIX",
    title: "Blitz mix",
    description: "5 questions mix type/niveau/grips.",
    questions: 5,
  },
];

function modeLabel(mode: GameMode) {
  return MODES.find((m) => m.id === mode)?.title ?? mode;
}

function ReturnCta({ role }: { role: string }) {
  const href =
    role === "TEACHER" ? "/app/teacher" : role === "SCHOOL_ADMIN" ? "/app/admin" : "/app/student";
  return (
    <div className="flex w-full justify-end">
      <Link
        href={href}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-normal text-white transition hover:border-cyan-400/70 hover:bg-white/10"
      >
        ← Retour accueil
      </Link>
    </div>
  );
}

type SessionStat = { accuracy: number; correct: number; total: number; createdAt: Date; durationMs?: number | null };

function computeUserStats(
  sessions: { mode: GameMode; totalQuestions: number; correctAnswers: number; createdAt: Date; durationMs: number | null }[]
) {
  const byMode = new Map<
    GameMode,
    { sessions: number; best: SessionStat | null; last: SessionStat | null }
  >();
  for (const s of sessions) {
    const accuracy = s.totalQuestions > 0 ? Math.round((s.correctAnswers / s.totalQuestions) * 100) : 0;
    const stat: SessionStat = {
      accuracy,
      correct: s.correctAnswers,
      total: s.totalQuestions,
      createdAt: s.createdAt,
      durationMs: s.durationMs,
    };
    const current = byMode.get(s.mode) ?? { sessions: 0, best: null, last: null };
    const best =
      !current.best || stat.accuracy > current.best.accuracy ? stat : current.best;
    byMode.set(s.mode, {
      sessions: current.sessions + 1,
      best,
      last: current.last ?? stat,
    });
  }
  return byMode;
}

function buildLeaderboard(
  sessions: { mode: GameMode; totalQuestions: number; correctAnswers: number; user: { id: string; name: string | null; email: string } }[]
) {
  const byMode = new Map<
    GameMode,
    { userId: string; name: string; email: string; bestAccuracy: number; sessions: number }[]
  >();
  const groups = new Map<
    string,
    { mode: GameMode; userId: string; name: string; email: string; best: number; sessions: number }
  >();

  for (const s of sessions) {
    const accuracy = s.totalQuestions > 0 ? s.correctAnswers / s.totalQuestions : 0;
    const key = `${s.mode}:${s.user.id}`;
    const entry = groups.get(key);
    if (!entry || accuracy > entry.best) {
      groups.set(key, {
        mode: s.mode,
        userId: s.user.id,
        name: s.user.name ?? s.user.email,
        email: s.user.email,
        best: accuracy,
        sessions: (entry?.sessions ?? 0) + 1,
      });
    } else {
      entry.sessions += 1;
    }
  }

  for (const entry of groups.values()) {
    const list = byMode.get(entry.mode) ?? [];
    list.push({
      userId: entry.userId,
      name: entry.name,
      email: entry.email,
      bestAccuracy: Math.round(entry.best * 100),
      sessions: entry.sessions,
    });
    byMode.set(entry.mode, list);
  }

  for (const [mode, list] of byMode.entries()) {
    list.sort((a, b) => b.bestAccuracy - a.bestAccuracy || b.sessions - a.sessions);
    byMode.set(mode, list.slice(0, 10));
  }

  return byMode;
}

function HistoryList({
  sessions,
}: {
  sessions: { mode: GameMode; totalQuestions: number; correctAnswers: number; createdAt: Date; durationMs: number | null }[];
}) {
  if (sessions.length === 0) {
    return <p className="text-sm text-slate-200">Aucune session jouée pour le moment.</p>;
  }
  return (
    <ul className="divide-y divide-white/5 text-sm text-slate-200">
      {sessions.map((s, idx) => {
        const accuracy = s.totalQuestions > 0 ? Math.round((s.correctAnswers / s.totalQuestions) * 100) : 0;
        return (
          <li key={`${s.mode}-${idx}`} className="py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-white">{modeLabel(s.mode)}</p>
                <p className="text-xs text-slate-400">
                  {s.correctAnswers}/{s.totalQuestions} · {accuracy}% ·{" "}
                  {s.durationMs ? `${Math.round(s.durationMs / 1000)}s` : "—"}
                </p>
              </div>
              <p className="text-xs text-slate-300">{s.createdAt.toLocaleString("fr-FR")}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default async function GamePage({ searchParams }: { searchParams?: SearchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const resolvedSearch = (await searchParams) ?? {};
  const modeParam = resolvedSearch.mode as GameMode | undefined;
  const selectedMode = MODES.find((m) => m.id === modeParam)?.id;

  const positions = await prisma.position.findMany({
    orderBy: { name: "asc" },
    include: { media: { take: 1 } },
  });

  let eligible = positions;
  const isStudent = session.user.role === "STUDENT";
  const isTeacherOrAdmin = session.user.role === "TEACHER" || session.user.role === "SCHOOL_ADMIN";

  if (isStudent) {
    const progress = await prisma.studentPositionProgress.findMany({
      where: { studentId: session.user.id },
      select: { positionId: true },
    });
    const unlockedIds = new Set(progress.map((p) => p.positionId));
    eligible = session.user.isPremium ? positions : positions.filter((p) => unlockedIds.has(p.id));
  } else if (isTeacherOrAdmin) {
    eligible = positions; // prof/admin : accès illimité
  } else {
    redirect("/login");
  }

  const userSessions = await prisma.gameSession.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  const historySessions = userSessions.slice(0, 5);
  const statsByMode = computeUserStats(userSessions);

  const leaderboardSessions = await prisma.gameSession.findMany({
    orderBy: { createdAt: "desc" },
    take: 400,
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  const leaderboardByMode = buildLeaderboard(leaderboardSessions);

  if (!selectedMode) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-0 py-6 md:px-8 md:py-10">
        <header className="panel flex flex-wrap items-center justify-between gap-3 p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
              {isTeacherOrAdmin ? "Prof / Admin" : "Élève"}
            </p>
            <h1 className="text-3xl font-semibold text-white">Mini-jeux</h1>
            <p className="text-sm text-slate-300">
              Choisis un mode. Pool basé sur tes positions débloquées (toutes si premium).
            </p>
          </div>
          <ReturnCta role={session.user.role} />
        </header>

        {eligible.length < 4 && (
          <section className="panel w-full max-w-3xl self-center p-6 text-center text-slate-200">
            <p>Pas assez de positions pour générer un jeu.</p>
            <p className="text-sm text-slate-300">
              Ajoute des positions vues (ou passe premium) pour débloquer plus de questions.
            </p>
            <Link
              href="/positions"
              className="mt-4 inline-flex items-center justify-center rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
            >
              Voir les positions
            </Link>
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-2">
          {MODES.map((mode) => {
            const stats = statsByMode.get(mode.id);
            return (
              <article key={mode.id} className="panel flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{mode.title}</h3>
                    <p className="text-sm text-slate-300">{mode.description}</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white">
                    {mode.questions} questions
                  </span>
                </div>
                <div className="text-sm text-slate-200">
                  <p>
                    Sessions : {stats?.sessions ?? 0} · Meilleur score :{" "}
                    {stats?.best ? `${stats.best.accuracy}%` : "—"}
                  </p>
                  {stats?.last && (
                    <p className="text-xs text-slate-400">
                      Dernière : {stats.last.correct}/{stats.last.total} · {stats.last.accuracy}%
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    href={`/app/student/game?mode=${mode.id}`}
                    className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-white transition ${
                      eligible.length < 4
                        ? "cursor-not-allowed border border-white/10 text-slate-500"
                        : "border border-white/15 bg-white/5 hover:border-cyan-400/70 hover:bg-white/10"
                    }`}
                  >
                    Jouer
                  </Link>
                </div>
              </article>
            );
          })}
        </section>

        <section className="panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Historique (5 dernières)</h2>
            <span className="text-xs text-slate-400">Par mode uniquement</span>
          </div>
          <div className="mt-3">
            <HistoryList sessions={historySessions} />
          </div>
        </section>

        <section className="panel p-5">
          <h2 className="text-lg font-semibold text-white">Leaderboards</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {MODES.map((mode) => {
              const board = leaderboardByMode.get(mode.id) ?? [];
              return (
                <div key={mode.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-white">{mode.title}</p>
                    <span className="text-xs text-slate-300">Top 10</span>
                  </div>
                  {board.length === 0 ? (
                    <p className="text-sm text-slate-300">Pas encore de scores.</p>
                  ) : (
                    <ol className="mt-2 space-y-1 text-sm text-slate-200">
                      {board.map((entry, idx) => (
                        <li
                          key={entry.userId}
                          className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2"
                        >
                          <span className="text-xs text-slate-400">#{idx + 1}</span>
                          <span className="flex-1 px-2">{entry.name}</span>
                          <span className="text-xs text-slate-300">
                            {entry.bestAccuracy}% · {entry.sessions} partie(s)
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    );
  }

  if (eligible.length < 4) {
    return (
      <main className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-4 px-6 py-12">
        <div className="panel w-full max-w-md p-6 text-center text-slate-200">
          <p>Pas assez de positions pour générer un jeu.</p>
          <p className="text-sm text-slate-300">
            Ajoute des positions vues (ou passe premium) pour débloquer plus de questions.
          </p>
          <Link
            href="/positions"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
          >
            Voir les positions
          </Link>
          <ReturnCta role={session.user.role} />
        </div>
      </main>
    );
  }

  const eligibleMeta = eligible.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    levelRequired: p.levelRequired,
    type: p.type,
    grips: p.grips,
    media: p.media,
  }));
  const questions: GameQuestion[] = buildGameQuestions(selectedMode, eligibleMeta);

  if (questions.length === 0) {
    return (
      <main className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-4 px-6 py-12">
        <div className="panel w-full max-w-md p-6 text-center text-slate-200">
          <p>Pas assez de contenu pour ce mode.</p>
          <p className="text-sm text-slate-300">Ajoute des positions ou change de mode.</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Link
              href="/positions"
              className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
            >
              Voir les positions
            </Link>
            <Link
              href="/app/student/game"
              className="inline-flex items-center justify-center rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/5"
            >
              Choisir un autre mode
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const userStats = statsByMode.get(selectedMode);
  const leaderboard = leaderboardByMode.get(selectedMode) ?? [];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-3 px-0 py-6 md:gap-6 md:px-8 md:py-10">
      <header className="panel flex flex-wrap items-center justify-between gap-3 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
            {isTeacherOrAdmin ? "Prof / Admin" : "Élève"}
          </p>
          <h1 className="text-3xl font-semibold text-white">{modeLabel(selectedMode)}</h1>
          <p className="text-sm text-slate-300">
            {questions.length} questions · pool basé sur tes positions débloquées
          </p>
          <p className="text-xs text-slate-400">
            Stats : {userStats?.sessions ?? 0} parties · Meilleur {userStats?.best ? `${userStats.best.accuracy}%` : "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/app/student/game"
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            ← Changer de mode
          </Link>
          <ReturnCta role={session.user.role} />
        </div>
      </header>

      <section className="panel w-full p-6">
        <GameClient mode={selectedMode} questions={questions} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="panel p-5">
          <h2 className="text-lg font-semibold text-white">Historique (5 dernières)</h2>
          <div className="mt-3">
            <HistoryList sessions={historySessions.filter((s) => s.mode === selectedMode)} />
          </div>
        </article>
        <article className="panel p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Leaderboard {modeLabel(selectedMode)}</h2>
            <span className="text-xs text-slate-300">Top 10</span>
          </div>
          {leaderboard.length === 0 ? (
            <p className="text-sm text-slate-300">Pas encore de scores.</p>
          ) : (
            <ol className="mt-2 space-y-2 text-sm text-slate-200">
              {leaderboard.map((entry, idx) => (
                <li
                  key={entry.userId}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                >
                  <span className="text-xs text-slate-400">#{idx + 1}</span>
                  <span className="flex-1 px-2">{entry.name}</span>
                  <span className="text-xs text-slate-300">
                    {entry.bestAccuracy}% · {entry.sessions} partie(s)
                  </span>
                </li>
              ))}
            </ol>
          )}
        </article>
      </section>
    </main>
  );
}
