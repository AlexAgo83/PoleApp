import Link from "next/link";
import { getServerSession } from "next-auth";
import clsx from "clsx";
import React from "react";
import { AVATAR_PLACEHOLDER } from "@/lib/placeholders";
import { authOptions } from "@/lib/auth";
import { resolveAvatarUrl } from "@/lib/avatar";
import { prisma } from "@/lib/prisma";
import { defaultHomeForRole } from "@/lib/rbac";
import { HeaderProfileMenu } from "./HeaderProfileMenu";
import { HeaderNotificationsMenu } from "./HeaderNotificationsMenu";

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
  let userRecord: { avatarUrl: string | null; avatarPublicId: string | null; name: string | null; email: string | null } | null = null;
  let school: { name: string | null; photoUrl: string | null } | null = null;
  let userLookupAttempted = false;
  let userLookupFailed = false;
  if (session?.user?.schoolId) {
    try {
      school = await prisma.school.findUnique({
        where: { id: session.user.schoolId },
        select: { name: true, photoUrl: true },
      });
    } catch {
      // ignore db errors for header rendering
    }
  }
  if (session?.user?.id) {
    userLookupAttempted = true;
    try {
      userRecord = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { avatarUrl: true, avatarPublicId: true, name: true, email: true },
      });
    } catch {
      userLookupFailed = true;
      // ignore db errors for header rendering
    }
  }
  const shouldForceLogoutModal = Boolean(session?.user?.id && userLookupAttempted && !userLookupFailed && !userRecord);
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
      userRecord?.avatarPublicId ??
      null,
    avatarUrl:
      profileImageUrl ??
      (session?.user as any)?.avatarUrl ??
      userRecord?.avatarUrl ??
      null,
    placeholder: AVATAR_PLACEHOLDER,
    seedKey: session?.user?.id ?? "user",
  });

  const roleLabel =
    session?.user?.role === "SCHOOL_ADMIN"
      ? "Admin"
      : session?.user?.role === "TEACHER"
        ? "Professeur"
        : session?.user?.role === "STUDENT"
          ? "Élève"
          : "Invité";
  const profileHref =
    session?.user?.role === "TEACHER" && session.user.id
      ? `/app/teachers/${session.user.id}`
      : "/app/profile";
  const schoolName = school?.name || title || "Mon école";
  const navLinks =
    session?.user?.role === "STUDENT"
      ? [
          { label: "Mon suivi", href: "/app/student/progress" },
          { label: "Réserver", href: "/app/student/school" },
          { label: "Mes cours", href: "/app/student/courses/agenda?view=month" },
        ]
      : session?.user?.role === "TEACHER"
        ? [{ label: "Planning", href: "/app/teacher/courses/agenda?view=month" }]
        : session?.user?.role === "SCHOOL_ADMIN"
          ? [
              { label: "Planning", href: "/app/teacher/courses/agenda?view=month" },
              { label: "Utilisateurs", href: "/app/admin/users" },
            ]
          : [];
  const homeHref = session?.user?.role ? defaultHomeForRole(session.user.role) : (foxHref ?? "/");

  return (
    <section
      className={clsx(
        "overflow-visible px-2 py-1 md:px-3 md:py-1",
        sticky ? "sticky top-0 z-30" : "",
        fullWidth ? "w-full" : "w-full max-w-6xl mx-auto",
        flushEdges ? "rounded-none" : "",
        className,
      )}
      style={style}
    >
      <div className="relative z-10 flex w-full flex-col gap-2 pl-0 pt-0">
        <div className="flex w-full flex-wrap items-center gap-2 md:gap-4">
          <Link
            href={homeHref}
            className="flex min-w-0 items-center gap-2 rounded-xl px-1 py-0.5 transition hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 md:gap-3"
          >
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-600 shadow-lg shadow-black/30 md:h-14 md:w-14">
              {school?.photoUrl ? (
                <img src={school.photoUrl} alt={schoolName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-extrabold text-white md:text-2xl">
                  {(schoolName || "E")[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-col text-left">
              <div className="max-w-[8.4rem] md:max-w-[12.2rem]">
                <span
                  className={clsx(
                    "font-bold text-white leading-tight whitespace-nowrap block",
                    schoolName && schoolName.length > 20
                      ? "truncate text-[clamp(12px,3.4vw,16px)] md:text-[clamp(14px,2.5vw,18px)]"
                      : schoolName && schoolName.length > 10
                        ? "text-[clamp(13px,3.6vw,17px)] md:text-[clamp(15px,2.7vw,19px)]"
                        : "text-[clamp(14px,4vw,18px)] md:text-[clamp(16px,3vw,20px)]"
                  )}
                  title={schoolName}
                >
                  {schoolName}
                </span>
              </div>
              <span className="text-indigo-100 leading-tight whitespace-nowrap [font-size:clamp(11px,3.2vw,15px)] md:[font-size:clamp(12px,2.5vw,16px)] max-w-[8.4rem] md:max-w-[12.2rem]">
                {eyebrow ?? `Espace ${roleLabel.toLowerCase()}`}
              </span>
            </div>
          </Link>

          {navLinks.length > 0 && (
            <nav className="hidden flex-wrap items-center gap-4 text-sm font-semibold text-slate-100 md:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 transition hover:bg-white/10"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2 md:gap-3">
            <HeaderNotificationsMenu />
            <HeaderProfileMenu
              avatarSrc={avatarSrc}
              name={userRecord?.name ?? session?.user?.name ?? userRecord?.email ?? session?.user?.email ?? "Profil"}
              roleLabel={roleLabel}
              profileHref={profileHref}
              navLinks={navLinks}
              forceLogoutModal={shouldForceLogoutModal}
            />
          </div>
        </div>
      </div>
      {children ? <div className="relative z-10 pt-4">{children}</div> : null}
    </section>
  );
}
