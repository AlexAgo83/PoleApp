"use client";

import { useMemo, useState } from "react";

import { GameQuestion } from "./logic";

type Props = {
  questions: GameQuestion[];
};

export function GameClient({ questions }: Props) {
  const prepared = useMemo(() => questions.slice(0, 10), [questions]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);

  const question = prepared[current];

  const handleAnswer = (optionId: string) => {
    const nextAnswers = [...answers];
    nextAnswers[current] = optionId;
    setAnswers(nextAnswers);
    if (current === prepared.length - 1) {
      setFinished(true);
    } else {
      setCurrent((c) => c + 1);
    }
  };

  if (!question) {
    return <p className="text-slate-200">Pas de questions disponibles.</p>;
  }

  if (finished) {
    const score = answers.reduce((acc, ans, idx) => {
      const q = prepared[idx];
      return acc + (ans === q.correctPositionId ? 1 : 0);
    }, 0);
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Résultats</h2>
        <p className="text-slate-200">
          Score : {score} / {prepared.length}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {prepared.map((q, idx) => {
            const correct = q.correctPositionId === answers[idx];
            const chosen = q.options.find((o) => o.id === answers[idx]);
            const correctOpt = q.options.find((o) => o.id === q.correctPositionId);
            return (
              <div
                key={q.id}
                className={`rounded-xl border p-3 ${
                  correct
                    ? "border-emerald-400/40 bg-emerald-500/10"
                    : "border-red-400/40 bg-red-500/10"
                } text-sm text-slate-200`}
              >
                <p className="font-semibold text-white">Q{idx + 1}</p>
                <p className="text-xs text-slate-300">
                  Ta réponse : {chosen?.name ?? "—"} | Bonne réponse : {correctOpt?.name}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-300">
        <p>
          Question {current + 1} / {prepared.length}
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={question.image}
          alt="question"
          className="h-80 w-full object-cover"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {question.options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => handleAnswer(opt.id)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-cyan-400/70 hover:bg-white/10"
          >
            {opt.name}
          </button>
        ))}
      </div>
    </div>
  );
}
