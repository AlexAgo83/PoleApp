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
  attenuatedForInjury?: boolean;
  fallbackCategory?: boolean;
  unsoftenedChaining?: boolean;
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
  attenuatedForInjury: boolean;
  unsoftenedChaining?: boolean;
};

const injuryMuscleRules: Record<
  string,
  {
    forbidden: string[];
    attenuate?: string[];
  }
> = {
  "Épaule": {
    forbidden: ["Épaules", "Deltoïdes", "Grand dorsal", "Biceps brachial", "Triceps"],
    attenuate: ["Abdominaux profonds", "Rachis lombaire"],
  },
  Poignet: { forbidden: ["Poignets", "Avant-bras"], attenuate: ["Épaules"] },
  Coude: { forbidden: ["Coudes", "Triceps", "Biceps brachial"], attenuate: ["Épaules", "Avant-bras"] },
  "Bas du dos": { forbidden: ["Rachis lombaire"], attenuate: ["Abdominaux profonds", "Hanches"] },
  Genou: { forbidden: ["Genoux"], attenuate: ["Hanches", "Rachis lombaire"] },
  Ventre: { forbidden: ["Abdominaux profonds"], attenuate: ["Rachis lombaire"] },
  Tête: { forbidden: [], attenuate: ["Épaules"] },
  Bassin: { forbidden: ["Hanches"], attenuate: ["Rachis lombaire"] },
  Jambes: { forbidden: ["Quadriceps", "Ischio-jambiers", "Adducteurs"], attenuate: ["Genoux", "Chevilles"] },
  Bras: { forbidden: ["Biceps brachial", "Triceps", "Avant-bras"], attenuate: ["Épaules"] },
};

function evaluateInjuryImpact(positionMuscles: string[], activeInjuries: string[], contraindicationHits: string[]) {
  const forbidden = new Set<string>();
  const attenuated = new Set<string>();

  activeInjuries.forEach((injury) => {
    const rules = injuryMuscleRules[injury];
    if (!rules) return;
    const hasForbidden = rules.forbidden.some((m) => positionMuscles.includes(m));
    const hasAttenuate = rules.attenuate?.some((m) => positionMuscles.includes(m));
    if (hasForbidden) {
      forbidden.add(injury);
    } else if (hasAttenuate) {
      attenuated.add(injury);
    }
  });

  contraindicationHits.forEach((injury) => forbidden.add(injury));

  return {
    forbidden: Array.from(forbidden),
    attenuated: Array.from(attenuated),
  };
}

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

  let category: "NOVELTY" | "INITIATED" | "PASSED" | "CHOREO";
  if (ratioMastered >= 0.2) {
    category = "CHOREO";
  } else if (tag === "DISCOVERY" || ratioNotStarted >= 0.6) {
    category = "NOVELTY";
  } else if (tag === "REVISION" || ratioInProgress >= 0.4) {
    category = "INITIATED";
  } else if (ratioPassed >= 0.6) {
    category = "PASSED";
  } else {
    category = "PASSED";
  }

  // Pondérations ajustées : pénaliser plus la répétition récente et les blessures, valoriser un peu plus les coups de cœur.
  const recencyPenalty = candidate.recentOccurrences * 2;
  const injuryPenalty = candidate.unsafeForStudents.length > 0 ? 8 : 0;
  const favoritesBonus = Math.min(5, candidate.favoriteCount) * 5; // 0 → 0, max 25
  const totalScore =
    discoveryScore * 3 + revisionScore * 2 + safeScore + favoritesBonus - recencyPenalty - injuryPenalty;
  const weightedScore = candidate.attenuatedForInjury ? totalScore / 2 : totalScore;

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
    score: weightedScore,
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
  const allowed = scored.filter((s) => !s.candidate.excludedForInjury);
  const excluded = scored.filter((s) => s.candidate.excludedForInjury).sort((a, b) => b.score - a.score);

  const buckets: Record<"NOVELTY" | "INITIATED" | "PASSED" | "CHOREO", typeof scored> = {
    NOVELTY: allowed.filter((s) => s.category === "NOVELTY").sort((a, b) => b.score - a.score),
    INITIATED: allowed.filter((s) => s.category === "INITIATED").sort((a, b) => b.score - a.score),
    PASSED: allowed.filter((s) => s.category === "PASSED").sort((a, b) => b.score - a.score),
    CHOREO: allowed.filter((s) => s.category === "CHOREO").sort((a, b) => b.score - a.score),
  };

  const selection: Array<{ item: (typeof scored)[number]; fallback?: boolean }> = [];
  const fallbackOrder = (cat: keyof typeof buckets) => {
    if (cat === "NOVELTY") return ["INITIATED", "PASSED", "CHOREO"] as const;
    if (cat === "CHOREO") return ["PASSED", "INITIATED", "NOVELTY"] as const;
    return ["PASSED", "INITIATED", "NOVELTY", "CHOREO"] as const;
  };

  const take = (cat: keyof typeof buckets) => {
    if (buckets[cat].length > 0) {
      const next = buckets[cat].shift();
      if (next) selection.push({ item: next, fallback: false });
      return;
    }
    const fbCat = fallbackOrder(cat).find((c) => buckets[c].length > 0);
    if (fbCat) {
      const next = buckets[fbCat].shift();
      if (next) selection.push({ item: next, fallback: true });
    }
  };

  take("NOVELTY");
  take("INITIATED");
  take("INITIATED");
  take("PASSED");
  take("PASSED");
  take("PASSED");
  take("CHOREO");

  const remainingAllowed = allowed
    .filter((s) => !selection.some((sel) => sel.item === s))
    .sort((a, b) => b.score - a.score);
  while (selection.length < limit && remainingAllowed.length > 0) {
    const next = remainingAllowed.shift()!;
    selection.push({ item: next, fallback: false });
  }

  if (options?.forceDiscoverySlot && !selection.some((s) => s.item.tag === "DISCOVERY")) {
    const bestDiscovery =
      allowed
        .filter((s) => s.tag === "DISCOVERY")
        .sort((a, b) => b.score - a.score)[0] ?? excluded.filter((s) => s.tag === "DISCOVERY")[0];
    if (bestDiscovery) {
      selection.pop();
      selection.unshift({ item: bestDiscovery, fallback: bestDiscovery.candidate.excludedForInjury });
    }
  }

  const transitionsPool = allowed.filter(
    (s) => s.candidate.type === "TRANSITION" && !selection.some((sel) => sel.item.candidate.positionId === s.candidate.positionId)
  );
  const result: typeof selection = [];
  const takeTransition = () => {
    const t = transitionsPool.shift();
    if (t) {
      result.push({ item: t, fallback: false });
      return true;
    }
    return false;
  };

  selection.slice(0, limit).forEach((sel, idx) => {
    const prev = result[result.length - 1]?.item;
    const isTransition = sel.item.candidate.type === "TRANSITION";
    if (isTransition && prev && prev.candidate.type === "TRANSITION") {
      return;
    }
    result.push(sel);
    const next = selection[idx + 1]?.item;
    const needTransition =
      !isTransition &&
      next &&
      next.candidate.type &&
      sel.item.candidate.type &&
      ((sel.item.candidate.type === "TRICK" && next.candidate.type === "SPIN") ||
        (sel.item.candidate.type === "SPIN" && next.candidate.type === "TRICK") ||
        (sel.item.candidate.type === "TRICK" && next.candidate.type === "TRICK"));
    if (needTransition) {
      const inserted = takeTransition();
      if (!inserted && next) {
        next.candidate.unsoftenedChaining = true;
      }
    }
  });

  let finalSelection = result.slice(0, limit);
  if (finalSelection.length < limit && excluded.length > 0) {
    const remainingExcluded = excluded.filter(
      (ex) => !finalSelection.some((sel) => sel.item.candidate.positionId === ex.candidate.positionId)
    );
    while (finalSelection.length < limit && remainingExcluded.length > 0) {
      finalSelection.push({ item: remainingExcluded.shift()!, fallback: true });
    }
  }

  const categoryLabel: Record<"NOVELTY" | "INITIATED" | "PASSED" | "CHOREO", string> = {
    NOVELTY: "Nouveauté",
    INITIATED: "Initié",
    PASSED: "Passé/Maîtrisé",
    CHOREO: "Fluide chorégraphié",
  };

  return finalSelection.slice(0, limit).map((entry) => ({
    positionId: entry.item.candidate.positionId,
    name: entry.item.candidate.name,
    type: entry.item.candidate.type,
    tag: entry.item.tag,
    category: entry.item.category,
    reason: `${categoryLabel[entry.item.category]} · ${entry.item.reason}`,
    favoriteCount: entry.item.candidate.favoriteCount,
    excludedForInjury: entry.item.candidate.excludedForInjury,
    unsafeInjuries: entry.item.candidate.unsafeForStudents,
    excluded: entry.item.candidate.excludedForInjury,
    forced: false,
    attenuatedForInjury: entry.item.candidate.attenuatedForInjury,
    fallbackCategory: entry.fallback,
    unsoftenedChaining: entry.item.unsoftenedChaining ?? false,
  }));
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

  const [course, positions, progress, injuries, recentCourses, favorites] = await Promise.all([
    prisma.course.findUnique({
      where: { id: courseId, schoolId },
      select: { discipline: true },
    }),
    prisma.position.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        discipline: true,
        contraindications: true,
        muscles: { include: { muscle: true } },
      },
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

  if (!course) {
    return [];
  }
  const courseDiscipline = course.discipline?.trim().toLowerCase() || null;

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
  const activeInjuryNames = studentIds.flatMap((id) => injuriesByStudent.get(id) ?? []);

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

  let candidates: CandidateInput[] = positions
    .filter((p) => {
      if (existingSet.has(p.id)) return false;
      if (!courseDiscipline) return true;
      const positionDiscipline = p.discipline?.trim().toLowerCase() || "";
      return positionDiscipline === courseDiscipline;
    })
    .map((position) => {
      const perStudentStatus = studentIds.map((studentId) => {
        const record = progressByStudent.get(studentId)?.get(position.id);
        return deriveLearningState(record?.learningStatus, record?.masteryLevel);
      });
      const contraindicationHits = matchContraindications(position, activeInjuryNames);
      const injuryImpact = evaluateInjuryImpact(
        position.muscles.map((m) => m.muscle.name),
        activeInjuryNames,
        contraindicationHits
      );
      const unsafe = Array.from(new Set([...(contraindicationHits ?? []), ...injuryImpact.forbidden, ...injuryImpact.attenuated]));
      return {
        positionId: position.id,
        name: position.name,
        type: position.type,
        recentOccurrences: recentPositionCounts.get(position.id) ?? 0,
        unsafeForStudents: unsafe,
        excludedForInjury: injuryImpact.forbidden.length > 0,
        perStudentStatus,
        favoriteCount: favoriteCounts.get(position.id) ?? 0,
        muscles: position.muscles.map((m) => m.muscle.name),
        attenuatedForInjury: injuryImpact.forbidden.length === 0 && injuryImpact.attenuated.length > 0,
      };
    });

  const safeCount = candidates.filter((c) => !c.excludedForInjury && !c.attenuatedForInjury).length;
  if (safeCount >= limit) {
    candidates = candidates.map((c) => (c.attenuatedForInjury ? { ...c, excludedForInjury: true } : c));
  }

  return selectTopSuggestions(candidates, limit, { forceDiscoverySlot });
}

// Exported for unit tests
export const __testing = {
  summarizeCandidate,
  selectTopSuggestions,
  deriveLearningState,
};
