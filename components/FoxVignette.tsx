import Link from "next/link";
import React from "react";

type FoxProps = { className?: string; sizeClass?: string; href?: string };

function VignetteShell({
  children,
  className,
  href,
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
}) {
  const content = (
    <div
      className={`group relative ${className ?? ""} ${
        href ? "cursor-pointer" : ""
      } rounded-full transition duration-200 hover:-translate-y-0.5 hover:scale-[1.025] hover:drop-shadow-[0_0_18px_rgba(236,72,153,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-fuchsia-300/70 focus-visible:outline-offset-4 active:scale-[0.98]`}
      aria-label={href ? "Retour à l'accueil" : undefined}
    >
      {children}
    </div>
  );

  if (href) {
    return (
      <Link href={href} aria-label="Retour à l'accueil" className="block">
        {content}
      </Link>
    );
  }
  return content;
}

export const CircularRedFox = ({ className, sizeClass, href }: FoxProps) => (
  <VignetteShell className={`${sizeClass ?? "h-20 w-20 md:h-32 md:w-32"} ${className ?? ""}`} href={href ?? "/"}>
    <div className="absolute inset-[-10px] rounded-full bg-gradient-to-r from-fuchsia-400/40 via-indigo-400/20 to-cyan-400/25 blur-2xl opacity-20 transition duration-300 group-hover:from-cyan-400/50 group-hover:via-emerald-300/30 group-hover:to-sky-300/35 group-hover:opacity-60" />
    <div className="absolute inset-[-4px] rounded-full bg-gradient-to-tr from-fuchsia-500/35 via-indigo-400/25 to-fuchsia-300/30 blur-xl opacity-20 transition duration-300 group-hover:from-cyan-500/45 group-hover:via-sky-400/30 group-hover:to-emerald-300/40 group-hover:opacity-70" />
    <div className="absolute inset-[6%] -z-10 rounded-full ring-1 ring-fuchsia-200/30 backdrop-blur-[1px] transition duration-300 group-hover:ring-cyan-200/60 group-hover:scale-[1.02]" />
    <div className="absolute inset-0 overflow-visible transition duration-200 group-hover:scale-[1.08]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/redFox_color.png"
        alt="Mascotte Red Fox"
        className="h-full w-full object-contain drop-shadow-2xl"
        style={{ transform: "scale(0.9)" }}
      />
    </div>
  </VignetteShell>
);

export const PlainRedFox = ({ className, sizeClass, href }: FoxProps) => (
  <VignetteShell className={`${sizeClass ?? "h-24 w-24 md:h-36 md:w-36"} ${className ?? ""}`} href={href ?? "/"}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src="/redFox_color.png"
      alt="Mascotte Red Fox"
      className="h-full w-full object-contain drop-shadow-2xl"
    />
  </VignetteShell>
);
