import { LearningStatus, MasteryLevel, Position } from "@prisma/client";

import { prisma } from "./prisma";

export type SuggestionTag = "DISCOVERY" | "REVISION" | "SAFE";

export type CourseSuggestion = {
  positionId: string;
  name: string;
  type?: Position["type"] | null;
  tag: SuggestionTag;
  category?: "NOVELTY" | "INITIATED" | "PASSED" | "CHOREO";
  reason: string;
  favoriteCount?: number;
  excludedForInjury?: boolean;
  unsafeInjuries?: string[];
  forced?: boolean;
  excluded?: boolean;
};

type CandidateInput = {
  positionId: string;
  name: string;
  type?: Position["type"] | null;
  recentOccurrences: number;
  unsafeForStudents: string[];
  excludedForInjury: boolean;
  perStudentStatus: Array<"NOT_STARTED" | "IN_PROGRESS" | "PASSED" | "MASTERED">;
  favoriteCount: number;
  muscles: string[];
};

function summarizeCandidate(candidate: CandidateInput): {
  score: number;
  tag: SuggestionTag;
  category: "NOVELTY" | "INITIATED" | "PASSED" | "CHOREO";
  reason: string;
} {
  const total = Math.max(1, candidate.perStudentStatus.length);
  const notStarted = candidate.perStudentStatus.filter((s) => s === "NOT_STARTED").length;
  const inProgress = candidate.perStudentStatus.filter((s) => s === "IN_PROGRESS").length;
  const passed = candidate.perStudentStatus.filter((s) => s === "PASSED").length;
  const mastered = candidate.perStudentStatus.filter((s) => s === "MASTERED").length;
  const ratioNotStarted = notStarted / total;
  const ratioMastered = mastered / total;
  const ratioPassed = passed / total;
  const ratioInProgress = inProgress / total;

  const discoveryScore = (notStarted * 3 + inProgress) / total;
  const revisionScore = (inProgress * 2 + notStarted) / total;
  const safeScore = (passed * 1.5 + mastered * 2) / total;

  const tag: SuggestionTag =
    discoveryScore >= revisionScore && discoveryScore >= safeScore
      ? "DISCOVERY"
      : revisionScore >= safeScore
        ? "REVISION"
        : "SAFE";

  const category: "NOVELTY" | "INITIATED" | "PASSED" | "CHOREO" =
    ratioMastered >= 0.2
      ? "CHOREO"
      : ratioNotStarted >= 0.8
        ? "NOVELTY"
        : ratioPassed >= 0.6
          ? "PASSED"
          : ratioInProgress >= 0.4
            ? "INITIATED"
            : "PASSED";

  // Pondérations ajustées : pénaliser plus la répétition récente et les blessures, valoriser un peu plus les coups de cœur.
  const recencyPenalty = candidate.recentOccurrences * 2;
  const injuryPenalty = candidate.unsafeForStudents.length > 0 ? 8 : 0;
  const favoritesBonus = Math.min(5, candidate.favoriteCount) * 5; // 0 → 0, max 25
  const totalScore =
    discoveryScore * 3 + revisionScore * 2 + safeScore + favoritesBonus - recencyPenalty - injuryPenalty;

  const parts: string[] = [];
  if (tag === "DISCOVERY") {
    parts.push(`${notStarted}/${total} n'ont jamais tenté`);
  } else if (tag === "REVISION") {
    parts.push(`${inProgress}/${total} encore en cours d'acquisition`);
  } else {
    parts.push(`${passed + mastered}/${total} maîtrisent`);
  }
  if (candidate.recentOccurrences > 0) {
    parts.push(`déjà vu ${candidate.recentOccurrences}x récemment`);
  }
  if (candidate.unsafeForStudents.length > 0) {
    parts.push(`exclue blessures (${candidate.unsafeForStudents.join(", ")})`);
  }
  if (candidate.favoriteCount > 0) {
    parts.push(`${candidate.favoriteCount} coup de cœur élève${candidate.favoriteCount > 1 ? "s" : ""}`);
  }

  return {
    score: totalScore,
    tag,
    category,
    reason: parts.join(" · "),
  };
}

function selectTopSuggestions(
  candidates: CandidateInput[],
  limit = 7,
  options?: { forceDiscoverySlot?: boolean }
): CourseSuggestion[] {
  const scored = candidates.map((c) => ({ ...summarizeCandidate(c), candidate: c }));
  const safe = scored.filter((s) => !s.candidate.excludedForInjury);
  const excluded = scored.filter((s) => s.candidate.excludedForInjury);
  const byCategory: Record<"NOVELTY" | "INITIATED" | "PASSED" | "CHOREO", typeof scored> = {
    NOVELTY: safe.filter((s) => s.category === "NOVELTY").sort((a, b) => b.score - a.score),
    INITIATED: safe.filter((s) => s.category === "INITIATED").sort((a, b) => b.score - a.score),
    PASSED: safe.filter((s) => s.category === "PASSED").sort((a, b) => b.score - a.score),
    CHOREO: safe.filter((s) => s.category === "CHOREO").sort((a, b) => b.score - a.score),
  };

  const selection: typeof scored = [];
  const take = (cat: "NOVELTY" | "INITIATED" | "PASSED" | "CHOREO") => {
    const next = byCategory[cat].shift();
    if (next) selection.push(next);
  };

  take("NOVELTY");
  take("INITIATED");
  take("INITIATED");
  take("PASSED");
  take("PASSED");
  take("PASSED");
  take("CHOREO");

  const remainingSafe = safe
    .filter((s) => !selection.includes(s))
    .sort((a, b) => b.score - a.score);
  while (selection.length < limit && remainingSafe.length > 0) {
    selection.push(remainingSafe.shift()!);
  }

  const remainingExcluded = excluded.sort((a, b) => b.score - a.score);
  while (selection.length < limit && remainingExcluded.length > 0) {
    selection.push(remainingExcluded.shift()!);
  }

  if (options?.forceDiscoverySlot && !selection.some((s) => s.tag === "DISCOVERY")) {
    const bestExcludedDiscovery = excluded
      .filter((s) => s.tag === "DISCOVERY")
      .sort((a, b) => b.score - a.score)[0];
    if (bestExcludedDiscovery) {
      selection.pop();
      selection.unshift(bestExcludedDiscovery);
    }
  }

  const categoryLabel: Record<"NOVELTY" | "INITIATED" | "PASSED" | "CHOREO", string> = {
    NOVELTY: "Nouveauté",
    INITIATED: "Initié",
    PASSED: "Passé/Maîtrisé",
    CHOREO: "Fluide chorégraphié",
  };

  // Réordonner pour éviter deux transitions de suite et insérer une transition après Trick↔Spin si possible.
  const transitionsPool = candidates.filter(
    (c) => c.type === "TRANSITION" && !selection.some((s) => s.candidate.positionId === c.positionId)
  );
  const reordered: typeof selection = [];
  const maybeTakeTransition = () => {
    const next = transitionsPool.shift();
    if (next) {
      reordered.push({ ...summarizeCandidate(next), candidate: next });
    }
  };
  selection.slice(0, limit).forEach((item, idx) => {
    const prev = reordered[reordered.length - 1];
    const isTransition = item.candidate.type === "TRANSITION";
    if (isTransition && prev && prev.candidate.type === "TRANSITION") {
      // skip duplicate transitions
      return;
    }
    reordered.push(item);
    const next = selection[idx + 1];
    const needTransition =
      !isTransition &&
      next &&
      next.candidate.type &&
      item.candidate.type &&
      ((item.candidate.type === "TRICK" && next.candidate.type === "SPIN") ||
        (item.candidate.type === "SPIN" && next.candidate.type === "TRICK"));
    if (needTransition) {
      maybeTakeTransition();
    }
  });

  const finalList = reordered.slice(0, limit).map((item) => ({
    positionId: item.candidate.positionId,
    name: item.candidate.name,
    type: item.candidate.type,
    tag: item.tag,
    category: item.category,
    reason: `${categoryLabel[item.category]} · ${item.reason}`,
    favoriteCount: item.candidate.favoriteCount,
    excludedForInjury: item.candidate.excludedForInjury,
    unsafeInjuries: item.candidate.unsafeForStudents,
    excluded: item.candidate.excludedForInjury,
    forced: false,
  }));

  return finalList;
}

function deriveLearningState(
  learningStatus?: LearningStatus | null,
  masteryLevel?: MasteryLevel | null
): "NOT_STARTED" | "IN_PROGRESS" | "PASSED" | "MASTERED" {
  if (masteryLevel === MasteryLevel.FLUID_CHOREO) {
    return "MASTERED";
  }
  if (masteryLevel === MasteryLevel.PASSED || learningStatus === LearningStatus.PASSED) {
    return "PASSED";
  }
  if (learningStatus === LearningStatus.IN_PROGRESS) {
    return "IN_PROGRESS";
  }
  return "NOT_STARTED";
}

function matchContraindications(
  position: Pick<Position, "contraindications"> & { muscles?: { muscle: { name: string } }[] },
  activeInjuries: string[]
): string[] {
  const lowerInjuries = activeInjuries.map((i) => i.toLowerCase());
  const hits = new Set<string>();
  if (position.muscles && position.muscles.length > 0) {
    position.muscles.forEach((m) => {
      if (lowerInjuries.includes(m.muscle.name.toLowerCase())) {
        hits.add(m.muscle.name);
      }
    });
  }
  if (position.contraindications) {
    const text = position.contraindications.toLowerCase();
    lowerInjuries.forEach((injury) => {
      if (text.includes(injury)) hits.add(injury);
    });
  }
  return Array.from(hits);
}

export async function generateCourseSuggestions(params: {
  courseId: string;
  schoolId: string;
  studentIds: string[];
  existingPositionIds?: string[];
  limit?: number;
  forceDiscoverySlot?: boolean;
}): Promise<CourseSuggestion[]> {
  const { courseId, schoolId, studentIds, existingPositionIds = [], limit = 4, forceDiscoverySlot = false } = params;
  if (studentIds.length === 0) return [];

  const [positions, progress, injuries, recentCourses, favorites] = await Promise.all([
    prisma.position.findMany({
      select: { id: true, name: true, type: true, contraindications: true, muscles: { include: { muscle: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.studentPositionProgress.findMany({
      where: { studentId: { in: studentIds } },
      select: { studentId: true, positionId: true, learningStatus: true, masteryLevel: true },
    }),
    prisma.studentInjury.findMany({
      where: { studentId: { in: studentIds }, isActive: true },
      select: {
        studentId: true,
        injuryType: { select: { name: true } },
      },
    }),
    prisma.course.findMany({
      where: {
        schoolId,
        id: { not: courseId },
        date: { gte: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) },
        attendances: { some: { studentId: { in: studentIds } } },
      },
      select: {
        id: true,
        positions: { select: { positionId: true } },
      },
      orderBy: { date: "desc" },
      take: 15,
    }),
    prisma.studentFavoritePosition.findMany({
      where: { studentId: { in: studentIds } },
      select: { positionId: true },
    }),
  ]);

  const existingSet = new Set(existingPositionIds);
  const progressByStudent = new Map<string, Map<string, { learningStatus: LearningStatus | null; masteryLevel: MasteryLevel | null }>>();
  progress.forEach((p) => {
    if (!progressByStudent.has(p.studentId)) {
      progressByStudent.set(p.studentId, new Map());
    }
    progressByStudent.get(p.studentId)!.set(p.positionId, {
      learningStatus: p.learningStatus,
      masteryLevel: p.masteryLevel,
    });
  });

  const injuriesByStudent = new Map<string, string[]>();
  injuries.forEach((inj) => {
    const list = injuriesByStudent.get(inj.studentId) ?? [];
    list.push(inj.injuryType.name);
    injuriesByStudent.set(inj.studentId, list);
  });

  const favoriteCounts = new Map<string, number>();
  favorites.forEach((fav) => {
    favoriteCounts.set(fav.positionId, (favoriteCounts.get(fav.positionId) ?? 0) + 1);
  });

  const recentPositionCounts = new Map<string, number>();
  recentCourses.forEach((course) => {
    course.positions.forEach((p) => {
      recentPositionCounts.set(p.positionId, (recentPositionCounts.get(p.positionId) ?? 0) + 1);
    });
  });

  const candidates: CandidateInput[] = positions
    .filter((p) => !existingSet.has(p.id))
    .map((position) => {
      const perStudentStatus = studentIds.map((studentId) => {
        const record = progressByStudent.get(studentId)?.get(position.id);
        return deriveLearningState(record?.learningStatus, record?.masteryLevel);
      });
      const activeInjuries = studentIds.flatMap((id) => injuriesByStudent.get(id) ?? []);
      const unsafe = matchContraindications(position, activeInjuries);
      return {
        positionId: position.id,
        name: position.name,
        type: position.type,
        recentOccurrences: recentPositionCounts.get(position.id) ?? 0,
        unsafeForStudents: unsafe,
        excludedForInjury: unsafe.length > 0,
        perStudentStatus,
        favoriteCount: favoriteCounts.get(position.id) ?? 0,
        muscles: position.muscles.map((m) => m.muscle.name),
      };
    });

  return selectTopSuggestions(candidates, limit, { forceDiscoverySlot });
}

// Exported for unit tests
export const __testing = {
  summarizeCandidate,
  selectTopSuggestions,
  deriveLearningState,
};
