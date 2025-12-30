"use client";

import { useState } from "react";
import clsx from "clsx";
import { LearningStatus } from "@prisma/client";

import { ProgressSlider } from "./ProgressSlider";
import { updateProgressAction } from "./actions";

type ProgressData = {
  learningStatus: LearningStatus;
  comment: string | null;
};

type PositionData = {
  id: string;
  name: string;
  type: string;
};

type Props = {
  position: PositionData;
  progress?: ProgressData;
  studentId: string;
};

export function ProgressCard({ position, progress, studentId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-base font-semibold text-white">{position.name}</p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-slate-300">{position.type}</p>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10"
          >
            {open ? "Fermer" : "Éditer"}
          </button>
        </div>
      </div>

      <div aria-hidden="true">
        <ProgressSlider
          name={undefined}
          defaultValue={progress?.learningStatus ?? LearningStatus.NOT_STARTED}
          hideLabel
          hideValue
          readOnly
        />
      </div>
      <div className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-sm text-slate-200">
        <span className="font-semibold text-slate-100">Commentaire :</span>{" "}
        {progress?.comment && progress.comment.trim().length > 0 ? progress.comment : "Aucun commentaire"}
      </div>

      {open ? (
        <form action={updateProgressAction} className="space-y-2 text-sm text-slate-200">
          <input type="hidden" name="studentId" value={studentId} />
          <input type="hidden" name="positionId" value={position.id} />
          <ProgressSlider
            name="learningStatus"
            defaultValue={progress?.learningStatus ?? LearningStatus.NOT_STARTED}
            tone="neutral"
          />
          <label className="block">
            Éditer le commentaire :
            <textarea
              name="comment"
              defaultValue={progress?.comment ?? ""}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
            />
          </label>
          <button
            type="submit"
            className={clsx(
              "rounded-full bg-cyan-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-cyan-400",
            )}
          >
            Sauvegarder
          </button>
        </form>
      ) : null}
    </article>
  );
}
