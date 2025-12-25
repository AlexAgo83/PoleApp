"use client";

type Props = { value: string };

export function ResetCopyButton({ value }: Props) {
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch (e) {
          console.error("clipboard", e);
        }
      }}
      className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[11px] font-semibold text-white transition hover:border-cyan-300/70 hover:bg-cyan-500/20"
      aria-label="Copier le mot de passe temporaire"
    >
      Copier
    </button>
  );
}
