import { LearningStatus, MasteryLevel, Position } from "@prisma/client";

import { prisma } from "./prisma";

export type SuggestionTag = "DISCOVERY" | "REVISION" | "SAFE";

export type CourseSuggestion = {
  positionId: string;
  name: string;
  type?: Position["type"] | null;
  tag: SuggestionTag;
  reason: string;
  favoriteCount?: number;
};

type CandidateInput = {
  positionId: string;
  name: string;
  type?: Position["type"] | null;
  recentOccurrences: number;
  unsafeForStudents: string[];
  perStudentStatus: Array<"NOT_STARTED" | "IN_PROGRESS" | "PASSED" | "MASTERED">;
  favoriteCount: number;
};

function summarizeCandidate(candidate: CandidateInput): {
  score: number;
  tag: SuggestionTag;
  reason: string;
} {
  const total = Math.max(1, candidate.perStudentStatus.length);
  const notStarted = candidate.perStudentStatus.filter((s) => s === "NOT_STARTED").length;
  const inProgress = candidate.perStudentStatus.filter((s) => s === "IN_PROGRESS").length;
  const passed = candidate.perStudentStatus.filter((s) => s === "PASSED").length;
  const mastered = candidate.perStudentStatus.filter((s) => s === "MASTERED").length;

  const discoveryScore = (notStarted * 3 + inProgress) / total;
  const revisionScore = (inProgress * 2 + notStarted) / total;
  const safeScore = (passed * 1.5 + mastered * 2) / total;

  const tag: SuggestionTag =
    discoveryScore >= revisionScore && discoveryScore >= safeScore
      ? "DISCOVERY"
      : revisionScore >= safeScore
        ? "REVISION"
        : "SAFE";

  const recencyPenalty = candidate.recentOccurrences * 1.2;
  const injuryPenalty = candidate.unsafeForStudents.length > 0 ? 6 : 0;
  const favoritesBonus = Math.min(3, candidate.favoriteCount) * 1.5;
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
    reason: parts.join(" · "),
  };
}

function selectTopSuggestions(candidates: CandidateInput[], limit = 4): CourseSuggestion[] {
  const scored = candidates.map((c) => ({ ...summarizeCandidate(c), candidate: c }));
  const byTag: Record<SuggestionTag, typeof scored> = {
    DISCOVERY: scored.filter((s) => s.tag === "DISCOVERY").sort((a, b) => b.score - a.score),
    REVISION: scored.filter((s) => s.tag === "REVISION").sort((a, b) => b.score - a.score),
    SAFE: scored.filter((s) => s.tag === "SAFE").sort((a, b) => b.score - a.score),
  };

  const selection: typeof scored = [];
  const take = (tag: SuggestionTag) => {
    const next = byTag[tag].shift();
    if (next) selection.push(next);
  };

  take("DISCOVERY");
  take("REVISION");
  take("SAFE");
  take("SAFE");

  if (selection.length < limit) {
    const remaining = scored
      .filter((s) => !selection.includes(s))
      .sort((a, b) => b.score - a.score);
    while (selection.length < limit && remaining.length > 0) {
      selection.push(remaining.shift()!);
    }
  }

  return selection.slice(0, limit).map((item) => ({
    positionId: item.candidate.positionId,
    name: item.candidate.name,
    type: item.candidate.type,
    tag: item.tag,
    reason: item.reason,
    favoriteCount: item.candidate.favoriteCount,
  }));
}

function deriveLearningState(
  learningStatus?: LearningStatus | null,
  masteryLevel?: MasteryLevel | null
): "NOT_STARTED" | "IN_PROGRESS" | "PASSED" | "MASTERED" {
  if (masteryLevel === MasteryLevel.CHOREO || masteryLevel === MasteryLevel.FLUID) {
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

function matchContraindications(position: Pick<Position, "contraindications">, activeInjuries: string[]): string[] {
  if (!position.contraindications) return [];
  const text = position.contraindications.toLowerCase();
  return activeInjuries.filter((injury) => text.includes(injury.toLowerCase()));
}

export async function generateCourseSuggestions(params: {
  courseId: string;
  schoolId: string;
  studentIds: string[];
  existingPositionIds?: string[];
  limit?: number;
}): Promise<CourseSuggestion[]> {
  const { courseId, schoolId, studentIds, existingPositionIds = [], limit = 4 } = params;
  if (studentIds.length === 0) return [];

  const [positions, progress, injuries, recentCourses, favorites] = await Promise.all([
    prisma.position.findMany({
      select: { id: true, name: true, type: true, contraindications: true },
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
        perStudentStatus,
        favoriteCount: favoriteCounts.get(position.id) ?? 0,
      };
    });

  return selectTopSuggestions(candidates, limit);
}

// Exported for unit tests
export const __testing = {
  summarizeCandidate,
  selectTopSuggestions,
  deriveLearningState,
};
