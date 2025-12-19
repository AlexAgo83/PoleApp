import { PositionLevel, PositionType } from "@prisma/client";
import Link from "next/link";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: {
    type?: string;
    level?: string;
  };
};

const typeLabels: Record<PositionType, string> = {
  SPIN: "Spin",
  TRICK: "Trick",
  TRANSITION: "Transition",
  WARMUP: "Warmup",
  STRENGTH: "Strength",
};

const levelLabels: Record<PositionLevel, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermédiaire",
  ADVANCED: "Avancé",
};

export default async function PositionsPage({ searchParams }: Props) {
  const awaitedParams = await searchParams;
  const rawType = awaitedParams?.type;
  const rawLevel = awaitedParams?.level;
  const typeFilter = Object.values(PositionType).includes(rawType as PositionType)
    ? (rawType as PositionType)
    : undefined;
  const levelFilter = Object.values(PositionLevel).includes(
    rawLevel as PositionLevel
  )
    ? (rawLevel as PositionLevel)
    : undefined;

  const positions = await prisma.position.findMany({
    where: {
      type: typeFilter,
      levelRequired: levelFilter,
    },
    include: {
      media: {
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  const types = Object.values(PositionType);
  const levels = Object.values(PositionLevel);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-12">
      <header className="panel p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">
              Positions
            </p>
            <h1 className="text-3xl font-semibold text-white">
              Parcourir les positions
            </h1>
            <p className="text-slate-300">
              Liste filtrable par type et niveau. Les images sont des
              placeholders seedés pour le mini-jeu.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
            >
              ← Accueil
            </Link>
            <Link
              href="/teacher/positions/new"
              className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Ajouter (prof/admin)
            </Link>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 text-slate-200">
              Type
            </span>
            <FilterButton
              label="Tous"
              active={!typeFilter}
              dimension="type"
              value=""
              otherName="level"
              otherValue={levelFilter}
            />
            {types.map((t) => (
              <FilterButton
                key={t}
                label={typeLabels[t]}
                active={typeFilter === t}
                dimension="type"
                value={t}
                otherName="level"
                otherValue={levelFilter}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 text-slate-200">
              Niveau
            </span>
            <FilterButton
              label="Tous"
              active={!levelFilter}
              dimension="level"
              value=""
              otherName="type"
              otherValue={typeFilter}
            />
            {levels.map((l) => (
              <FilterButton
                key={l}
                label={levelLabels[l]}
                active={levelFilter === l}
                dimension="level"
                value={l}
                otherName="type"
                otherValue={typeFilter}
              />
            ))}
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {positions.map((position) => {
          const cover = position.media[0];
          return (
            <Link
              key={position.id}
              href={`/positions/${position.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition hover:-translate-y-0.5 hover:border-cyan-400/60 hover:bg-white/10"
            >
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover.url}
                  alt={position.name}
                  className="h-48 w-full object-cover"
                />
              ) : (
                <div className="flex h-48 w-full items-center justify-center bg-white/5 text-sm text-slate-300">
                  Pas d’image
                </div>
              )}
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold text-white">
                    {position.name}
                  </h3>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-amber-100">
                    {levelLabels[position.levelRequired]}
                  </span>
                </div>
                <p className="text-sm text-cyan-200">{typeLabels[position.type]}</p>
                <p className="text-sm text-slate-300 line-clamp-2">
                  {position.tips ?? position.description ?? "Aucun détail"}
                </p>
              </div>
            </Link>
          );
        })}
        {positions.length === 0 && (
          <div className="panel col-span-full p-6 text-slate-200">
            Aucune position ne correspond aux filtres.
          </div>
        )}
      </section>
    </main>
  );
}

function FilterButton({
  label,
  active,
  dimension,
  value,
  otherName,
  otherValue,
}: {
  label: string;
  active: boolean;
  dimension: "type" | "level";
  value: string;
  otherName: "type" | "level";
  otherValue?: string;
}) {
  return (
    <form action="/positions" method="get">
      {otherValue ? (
        <input type="hidden" name={otherName} value={otherValue} />
      ) : null}
      <button
        type="submit"
        name={value ? dimension : undefined}
        value={value || undefined}
        className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
          active
            ? "bg-cyan-500 text-slate-900"
            : "border border-white/10 bg-white/5 text-white hover:border-cyan-400/70 hover:bg-white/10"
        }`}
      >
        {label}
      </button>
    </form>
  );
}
