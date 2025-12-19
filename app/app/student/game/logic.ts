import { Position } from "@prisma/client";

export type GameQuestion = {
  id: string;
  image: string;
  correctPositionId: string;
  options: { id: string; name: string }[];
};

const QUESTIONS_COUNT = 10;

export function buildGameQuestions(positions: Position[]): GameQuestion[] {
  const shuffled = [...positions].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, Math.min(QUESTIONS_COUNT, shuffled.length));

  return picked.map((position) => {
    const options = pickOptions(position, positions);
    return {
      id: position.id,
      image:
        position.media?.[0]?.url ??
        `https://placehold.co/800x1000/png?text=${encodeURIComponent(position.name)}`,
      correctPositionId: position.id,
      options,
    };
  });
}

function pickOptions(target: Position, positions: Position[]) {
  const pool = positions.filter((p) => p.id !== target.id);
  const shuffled = pool.sort(() => Math.random() - 0.5);
  const distractors = shuffled.slice(0, 3).map((p) => ({ id: p.id, name: p.name }));
  const all = [...distractors, { id: target.id, name: target.name }].sort(
    () => Math.random() - 0.5
  );
  return all;
}
