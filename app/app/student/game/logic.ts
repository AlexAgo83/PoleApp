import type { GameMode as PrismaGameMode } from "@prisma/client";

export type GameMode = PrismaGameMode;

export type GameQuestion = {
  id: string;
  prompt: string;
  image?: string;
  correctOptionId: string;
  options: { id: string; label: string }[];
};

const QUESTIONS_COUNT = 10;
const BLITZ_COUNT = 5;

const POSITION_TYPES = ["SPIN", "TRICK", "TRANSITION", "WARMUP", "STRENGTH"];
const POSITION_LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
const GRIPS_POOL = ["TRUE", "CUP", "TWIST", "FOREARM", "ELBOW", "OTHER", "NONE"];

type PositionWithMeta = {
  id: string;
  name: string;
  description?: string | null;
  levelRequired: string;
  type: string;
  grips?: string | null;
  media?: { url: string }[];
};

export function buildGameQuestions(mode: GameMode, positions: PositionWithMeta[]): GameQuestion[] {
  const count = mode === "BLITZ_MIX" ? BLITZ_COUNT : QUESTIONS_COUNT;
  const shuffled = [...positions].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, Math.min(count, shuffled.length));

  switch (mode) {
    case "PHOTO_NAME":
      return picked.map((position) => {
        const options = pickOptions(position, positions);
        return {
          id: position.id,
          prompt: "Quelle est cette position ?",
          image:
            position.media?.[0]?.url ??
            `https://placehold.co/800x1000/png?text=${encodeURIComponent(position.name)}`,
          correctOptionId: position.id,
          options,
        };
      });
    case "NAME_TYPE":
      return picked.map((position) => {
        const options = pickDiscreteOptions(position.type, POSITION_TYPES);
        return {
          id: position.id,
          prompt: `Quel est le type de ${position.name} ?`,
          correctOptionId: position.type,
          options,
        };
      });
    case "NAME_LEVEL":
      return picked.map((position) => {
        const options = pickDiscreteOptions(position.levelRequired, POSITION_LEVELS);
        return {
          id: position.id,
          prompt: `Quel est le niveau requis pour ${position.name} ?`,
          correctOptionId: position.levelRequired,
          options,
        };
      });
    case "NAME_GRIPS": {
      return picked.map((position) => {
        const gripValue = position.grips?.trim() || "NONE";
        const options = pickDiscreteOptions(gripValue, GRIPS_POOL);
        return {
          id: position.id,
          prompt: `Quel grip principal pour ${position.name} ?`,
          correctOptionId: gripValue,
          options,
        };
      });
    }
    case "DESCRIPTION_NAME": {
      return picked.map((position) => {
        const description =
          position.description?.trim() ||
          `Position ${position.name} (${position.type.toLowerCase()}, niveau ${position.levelRequired.toLowerCase()}).`;
        const options = pickOptions(position, positions);
        return {
          id: position.id,
          prompt: description,
          correctOptionId: position.id,
          options,
        };
      });
    }
    case "BLITZ_MIX": {
      return picked.map((position) => {
        const kind = ["NAME_TYPE", "NAME_LEVEL", "NAME_GRIPS"][Math.floor(Math.random() * 3)];
        if (kind === "NAME_TYPE") {
          const options = pickDiscreteOptions(position.type, POSITION_TYPES);
          return {
            id: `${position.id}-type`,
            prompt: `Type pour ${position.name} ?`,
            correctOptionId: position.type,
            options,
          };
        }
        if (kind === "NAME_LEVEL") {
          const options = pickDiscreteOptions(position.levelRequired, POSITION_LEVELS);
          return {
            id: `${position.id}-level`,
            prompt: `Niveau pour ${position.name} ?`,
            correctOptionId: position.levelRequired,
            options,
          };
        }
        const gripValue = position.grips?.trim() || "NONE";
        const options = pickDiscreteOptions(gripValue, GRIPS_POOL);
        return {
          id: `${position.id}-grip`,
          prompt: `Grip principal pour ${position.name} ?`,
          correctOptionId: gripValue,
          options,
        };
      });
    }
    default:
      return [];
  }
}

function pickOptions(target: PositionWithMeta, positions: PositionWithMeta[]) {
  const pool = positions.filter((p) => p.id !== target.id);
  const shuffled = pool.sort(() => Math.random() - 0.5);
  const distractors = shuffled.slice(0, 3).map((p) => ({ id: p.id, label: p.name }));
  const all = [...distractors, { id: target.id, label: target.name }].sort(
    () => Math.random() - 0.5
  );
  return all;
}

function pickDiscreteOptions(correct: string, pool: string[]) {
  const rest = pool.filter((v) => v !== correct);
  const shuffled = rest.sort(() => Math.random() - 0.5);
  const distractors = shuffled.slice(0, 3).map((v) => ({ id: v, label: v }));
  const all = [...distractors, { id: correct, label: correct }].sort(() => Math.random() - 0.5);
  return all;
}
