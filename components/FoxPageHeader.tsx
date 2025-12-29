import Link from "next/link";
import { getServerSession } from "next-auth";
import clsx from "clsx";
import React from "react";
import { SignOutModalButton } from "@/components/auth/SignOutModalButton";
import { AVATAR_PLACEHOLDER } from "@/lib/placeholders";
import { authOptions } from "@/lib/auth";
import { resolveAvatarUrl } from "@/lib/avatar";
import { prisma } from "@/lib/prisma";

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
  fullWidth?: boolean;
  flushEdges?: boolean;
  sticky?: boolean;
  profileImageUrl?: string | null;
};

const baseOverlay =
  "linear-gradient(135deg, rgba(10,15,30,0.85), rgba(15,25,45,0.7))";

export async function FoxPageHeader({
  title,
  eyebrow,
  buttons = [],
  backgroundImage,
  foxHref,
  className,
  children,
  fullWidth = true,
  flushEdges = true,
  sticky = true,
  profileImageUrl,
}: Props) {
  const session = await getServerSession(authOptions).catch(() => null);
  let dbAvatar: { avatarUrl: string | null; avatarPublicId: string | null } | null = null;
  if (!profileImageUrl && session?.user?.id) {
    try {
      dbAvatar = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { avatarUrl: true, avatarPublicId: true },
      });
    } catch {
      // ignore db errors for header rendering
    }
  }
  const style = {
    backgroundImage: backgroundImage
      ? `${baseOverlay}, url(${backgroundImage})`
      : baseOverlay,
    backgroundSize: "cover",
    backgroundPosition: "center",
    border: "none",
    boxShadow: "none",
    ...(flushEdges
      ? {
          borderRadius: 0,
          borderTop: "none",
          borderLeft: "none",
          borderRight: "none",
        }
      : {}),
    ...(fullWidth
      ? { width: "100vw", marginLeft: "calc(50% - 50vw)" }
      : {}),
  } as React.CSSProperties;
  const avatarSrc = resolveAvatarUrl({
    avatarPublicId:
      (session?.user as any)?.avatarPublicId ??
      dbAvatar?.avatarPublicId ??
      null,
    avatarUrl:
      profileImageUrl ??
      (session?.user as any)?.avatarUrl ??
      dbAvatar?.avatarUrl ??
      null,
    placeholder: AVATAR_PLACEHOLDER,
    seedKey: session?.user?.id ?? "user",
  });

  const renderButton = (btn: HeaderButton, idx: number) => {
    if (btn.href?.includes("/api/auth/signout") || btn.label.toLowerCase().includes("déconnexion")) {
      return null;
    }
    if (btn.label.toLowerCase().includes("mon espace")) {
      return null;
    }
    const variant =
      btn.variant === "primary"
        ? "border-cyan-300/70 bg-cyan-500/20 hover:border-cyan-200 hover:bg-cyan-500/30 text-white"
        : "border-white/10 bg-white/5 hover:border-cyan-400/70 hover:bg-white/10 text-white";
    if (btn.href === "/api/auth/signout") {
      return (
        <SignOutModalButton
          key={`${btn.href}-${idx}`}
          label={btn.label}
        />
      );
    }
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
        "overflow-hidden px-2 py-2 md:px-3 md:py-3",
        sticky ? "sticky top-0 z-30" : "",
        fullWidth ? "w-full" : "w-full max-w-6xl mx-auto",
        flushEdges ? "rounded-none" : "",
        className,
      )}
      style={style}
    >
      <div className="relative z-10 flex w-full flex-wrap items-center justify-between gap-3 pl-0 pt-0">
        <div className="space-y-1">
          <Link
            href={
              buttons.find((b) => b.label.toLowerCase().includes("espace"))?.href ??
              buttons[0]?.href ??
              foxHref ??
              "/"
            }
            className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-indigo-100 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
          >
            <img src="/house.svg" alt="" className="h-4 w-4" />
            {eyebrow ? (
              <span className="text-xs uppercase tracking-[0.14em] text-indigo-100">
                {eyebrow}
              </span>
            ) : (
              <span className="text-xs uppercase tracking-[0.14em] text-indigo-100">
                {title}
              </span>
            )}
          </Link>
          <h1 className="sr-only">{title}</h1>
        </div>
        {buttons.length > 0 ? (
          <div className="flex flex-wrap items-center justify-end gap-2 md:self-start">
            {buttons.map(renderButton)}
            <SignOutModalButton
              className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 p-0.5 shadow-sm shadow-cyan-900/30 transition hover:border-cyan-300/70 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
              ariaLabel="Se déconnecter"
            >
              <img
                src={avatarSrc}
                alt="Profil"
                className="h-8 w-8 rounded-full border border-white/20 object-cover"
              />
            </SignOutModalButton>
          </div>
        ) : null}
      </div>
      {children ? <div className="relative z-10 pt-4">{children}</div> : null}
    </section>
  );
}
