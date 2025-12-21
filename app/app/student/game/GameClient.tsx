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
  const [selected, setSelected] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);

  const question = prepared[current];

  const handleSelect = (optionId: string) => {
    setSelected(optionId);
    setReveal(true);
  };

  const handleNext = () => {
    if (!reveal || !selected) return;
    const nextAnswers = [...answers];
    nextAnswers[current] = selected;
    setAnswers(nextAnswers);
    if (current === prepared.length - 1) {
      setFinished(true);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setReveal(false);
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
        {reveal && selected && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              selected === question.correctPositionId
                ? "border border-emerald-400/60 bg-emerald-500/15 text-emerald-50"
                : "border border-red-400/60 bg-red-500/15 text-red-50"
            }`}
          >
            {selected === question.correctPositionId ? "Bonne réponse" : "Mauvaise réponse"}
          </span>
        )}
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
        {question.options.map((opt) => {
          const isSelected = selected === opt.id;
          const isCorrect = question.correctPositionId === opt.id;
          const style =
            reveal && isCorrect
              ? "border-emerald-400/60 bg-emerald-500/15"
              : reveal && isSelected && !isCorrect
              ? "border-red-400/60 bg-red-500/15"
              : "border-white/10 bg-white/5 hover:border-cyan-400/70 hover:bg-white/10";
          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              disabled={reveal}
              className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold text-white transition ${style} ${
                reveal ? "cursor-not-allowed opacity-90" : ""
              }`}
            >
              {opt.name}
            </button>
          );
        })}
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleNext}
          disabled={!reveal || !selected}
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            !reveal || !selected
              ? "cursor-not-allowed border border-white/10 text-slate-500"
              : "border border-white/10 text-white hover:border-cyan-400/70 hover:bg-white/5"
          }`}
        >
          {current === prepared.length - 1 ? "Voir les résultats" : "Question suivante"}
        </button>
      </div>
    </div>
  );
}
