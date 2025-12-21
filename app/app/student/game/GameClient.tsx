"use client";

import { useMemo, useState } from "react";

import { GameMode, GameQuestion } from "./logic";

type Props = {
  mode: GameMode;
  questions: GameQuestion[];
};

type AnswerRecord = { questionId: string; optionId: string };

export function GameClient({ questions, mode }: Props) {
  const prepared = useMemo(() => questions, [questions]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [finished, setFinished] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [startedAt] = useState(() => performance.now());

  const question = prepared[current];

  const handleSelect = (optionId: string) => {
    setSelected(optionId);
    setReveal(true);
  };

  const handleNext = () => {
    if (!reveal || !selected || !question) return;
    const nextAnswers = [...answers, { questionId: question.id, optionId: selected }];
    setAnswers(nextAnswers);
    if (current === prepared.length - 1) {
      setFinished(true);
      void persistResults(nextAnswers);
    } else {
      setCurrent((c) => c + 1);
      setSelected(null);
      setReveal(false);
    }
  };

  const persistResults = async (records: AnswerRecord[]) => {
    setSaving(true);
    setError(null);
    const correctAnswers = records.reduce((acc, record, idx) => {
      const q = prepared[idx];
      return acc + (q && record.optionId === q.correctOptionId ? 1 : 0);
    }, 0);
    const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
    try {
      await fetch("/api/game/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          totalQuestions: prepared.length,
          correctAnswers,
          durationMs,
        }),
      });
      setSaved(true);
    } catch (err) {
      setError("Impossible d'enregistrer la session (hors ligne ?)");
    } finally {
      setSaving(false);
    }
  };

  if (!question) {
    return <p className="text-slate-200">Pas de questions disponibles.</p>;
  }

  const renderResults = () => {
    const score = answers.reduce((acc, ans, idx) => {
      const q = prepared[idx];
      return acc + (q && ans.optionId === q.correctOptionId ? 1 : 0);
    }, 0);
    const accuracy = Math.round((score / prepared.length) * 100);
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-white">Résultats</h2>
            <p className="text-slate-200">
              Score : {score} / {prepared.length} ({accuracy}%)
            </p>
            {saving && <p className="text-xs text-slate-300">Sauvegarde...</p>}
            {saved && <p className="text-xs text-emerald-300">Session enregistrée</p>}
            {error && <p className="text-xs text-red-300">{error}</p>}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:border-cyan-400/60 hover:bg-white/10"
            >
              Rejouer ce mode
            </button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {prepared.map((q, idx) => {
            const record = answers[idx];
            const correct = q.correctOptionId === record?.optionId;
            const chosen = q.options.find((o) => o.id === record?.optionId);
            const correctOpt = q.options.find((o) => o.id === q.correctOptionId);
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
                <p className="text-xs text-slate-300">{q.prompt}</p>
                <p className="text-xs text-slate-200">
                  Ta réponse : {chosen?.label ?? "—"} | Bonne réponse : {correctOpt?.label ?? "—"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (finished) {
    return renderResults();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-semibold text-white">Énoncé</p>
        <p className="mt-1 text-sm text-slate-200">{question.prompt}</p>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-300">
        <p>
          Question {current + 1} / {prepared.length}
        </p>
        {reveal && selected && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              selected === question.correctOptionId
                ? "border border-emerald-400/60 bg-emerald-500/15 text-emerald-50"
                : "border border-red-400/60 bg-red-500/15 text-red-50"
            }`}
          >
            {selected === question.correctOptionId ? "Bonne réponse" : "Mauvaise réponse"}
          </span>
        )}
      </div>

      {question.image && (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={question.image}
            alt="question"
            className="h-80 w-full object-cover"
          />
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {question.options.map((opt) => {
          const isSelected = selected === opt.id;
          const isCorrect = question.correctOptionId === opt.id;
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
              {opt.label}
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
