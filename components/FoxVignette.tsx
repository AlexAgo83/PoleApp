import React from "react";

type FoxProps = { className?: string; sizeClass?: string };

export const CircularRedFox = ({ className, sizeClass }: FoxProps) => (
  <div className={`pointer-events-none relative ${sizeClass ?? "h-20 w-20 md:h-32 md:w-32"} ${className ?? ""}`}>
    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-400/25 via-indigo-400/20 to-fuchsia-500/25 blur-3xl" />
    <div className="absolute inset-0 rounded-full overflow-hidden">
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
