import React from "react";

type FoxProps = { className?: string; sizeClass?: string };

export const CircularRedFox = ({ className, sizeClass }: FoxProps) => (
  <div className={`pointer-events-none relative ${sizeClass ?? "h-20 w-20 md:h-32 md:w-32"} ${className ?? ""}`}>
    <div className="absolute inset-[-12px] rounded-full bg-gradient-to-r from-fuchsia-400/60 via-indigo-400/30 to-cyan-400/35 blur-3xl opacity-95" />
    <div className="absolute inset-[-6px] rounded-full bg-gradient-to-tr from-fuchsia-500/50 via-indigo-400/35 to-fuchsia-300/40 blur-2xl" />
    <div className="absolute inset-0 rounded-full overflow-hidden ring-1 ring-fuchsia-200/35 backdrop-blur-[1px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/redFox_color.png"
        alt="Mascotte Red Fox"
        className="h-full w-full object-contain drop-shadow-2xl"
        style={{ transform: "scale(0.9)" }}
      />
    </div>
  </div>
);

export const PlainRedFox = ({ className, sizeClass }: FoxProps) => (
  <div className={`pointer-events-none relative ${sizeClass ?? "h-24 w-24 md:h-36 md:w-36"} ${className ?? ""}`}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src="/redFox_color.png"
      alt="Mascotte Red Fox"
      className="h-full w-full object-contain drop-shadow-2xl"
    />
  </div>
);
