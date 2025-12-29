import Link from "next/link";
import clsx from "clsx";
import { CircularRedFox } from "@/components/FoxVignette";
import React from "react";

type HeaderButton = {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
  icon?: React.ReactNode;
  ariaLabel?: string;
};

type Props = {
  title: string;
  eyebrow?: string;
  buttons?: HeaderButton[];
  backgroundImage?: string | null;
  foxHref?: string;
  className?: string;
  children?: React.ReactNode;
};

const baseOverlay =
  "linear-gradient(135deg, rgba(10,15,30,0.85), rgba(15,25,45,0.7))";

export function FoxPageHeader({
  title,
  eyebrow,
  buttons = [],
  backgroundImage,
  foxHref = "/",
  className,
  children,
}: Props) {
  const style = {
    backgroundImage: backgroundImage
      ? `${baseOverlay}, url(${backgroundImage})`
      : baseOverlay,
    backgroundSize: "cover",
    backgroundPosition: "center",
    borderRadius: 0,
    borderTop: "none",
    borderLeft: "none",
    borderRight: "none",
  } as React.CSSProperties;

  const renderButton = (btn: HeaderButton, idx: number) => {
    const variant =
      btn.variant === "primary"
        ? "border-cyan-300/70 bg-cyan-500/20 hover:border-cyan-200 hover:bg-cyan-500/30 text-white"
        : "border-white/10 bg-white/5 hover:border-cyan-400/70 hover:bg-white/10 text-white";
    return (
      <Link
        key={`${btn.href}-${idx}`}
        href={btn.href}
        aria-label={btn.ariaLabel ?? btn.label}
        className={clsx(
          "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold transition",
          variant,
        )}
      >
        {btn.icon}
        {btn.label}
      </Link>
    );
  };

  return (
    <section
      className={clsx(
        "panel relative left-1/2 right-1/2 w-screen max-w-none -mx-[50vw] overflow-hidden border-indigo-400/25 px-2 py-2 shadow-indigo-900/30 rounded-none md:px-3 md:py-3 md:rounded-none",
        className,
      )}
      style={style}
    >
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pl-24 md:pl-0 pt-0">
        <div className="space-y-1">
          {eyebrow ? (
            <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">
              {eyebrow}
            </p>
          ) : (
            <p className="text-xs uppercase tracking-[0.14em] text-indigo-100">
              {title}
            </p>
          )}
          <h1 className="sr-only">{title}</h1>
        </div>
        {buttons.length > 0 ? (
          <div className="flex flex-wrap items-center justify-end gap-2 md:self-start">
            {buttons.map(renderButton)}
          </div>
        ) : null}
      </div>
      {children ? <div className="relative z-10 pt-4">{children}</div> : null}
    </section>
  );
}
