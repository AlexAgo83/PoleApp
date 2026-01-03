"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

type NotificationResponse = {
  notifications: Notification[];
  unreadCount: number;
};

const sortByCreatedAtDesc = (list: Notification[]) =>
  [...list].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

async function bulkDelete(ids: string[]) {
  if (ids.length === 0) return;
  const res = await fetch("/api/notifications/delete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ids }),
    cache: "no-store",
    keepalive: true,
  });
  if (!res.ok) {
    throw new Error("delete failed");
  }
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HeaderNotificationsMenu() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotificationResponse>({ notifications: [], unreadCount: 0 });
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as NotificationResponse;
      const sorted = sortByCreatedAtDesc(json.notifications ?? []);
      setData({
        notifications: sorted,
        unreadCount:
          typeof json.unreadCount === "number"
            ? json.unreadCount
            : sorted.filter((n) => !n.readAt).length,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    load();
    const interval = setInterval(load, 60_000);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markReadAndNavigate = async (notif: Notification) => {
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        keepalive: true,
        body: JSON.stringify({ ids: [notif.id] }),
      });
    } catch (err) {
      // ignore errors, we still optimistically mark read
    } finally {
      setData((prev) => ({
        unreadCount: prev.unreadCount - (!notif.readAt ? 1 : 0),
        notifications: prev.notifications.map((n) =>
          n.id === notif.id ? { ...n, readAt: new Date().toISOString() } : n
        ),
      }));
      if (notif.link) {
        router.push(notif.link);
      }
      setOpen(false);
    }
  };

  const deleteOne = async (notif: Notification) => {
    try {
      await bulkDelete([notif.id]);
      setData((prev) => ({
        unreadCount: prev.unreadCount - (!notif.readAt ? 1 : 0),
        notifications: prev.notifications.filter((n) => n.id !== notif.id),
      }));
      // Reload to ensure server state is reflected (avoid ghost reappear on reopen)
      await load();
    } catch (err) {
      // fallback: reload to reflect server state
      await load();
    }
  };

  const unreadBadge = data.unreadCount > 0;
  const deleteAll = async () => {
    const ids = data.notifications.map((n) => n.id);
    if (ids.length === 0) return;
    try {
      await bulkDelete(ids);
      setData({ notifications: [], unreadCount: 0 });
      await load();
    } catch (err) {
      await load();
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) {
            void load();
          }
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-cyan-300/70 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200 md:h-12 md:w-12"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Notifications"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 00-5-5.917V4a1 1 0 10-2 0v1.083A6 6 0 006 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5" />
          <path d="M13 19a2 2 0 11-4 0" />
        </svg>
        {unreadBadge ? (
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-rose-400 ring-2 ring-slate-900" aria-label="Notifications non lues" />
        ) : null}
      </button>
      <div
        className={clsx(
          "absolute right-0 mt-2 w-72 max-h-[60vh] rounded-xl border border-white/10 bg-slate-900/90 shadow-xl shadow-black/30 backdrop-blur",
          open ? "block" : "hidden"
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
          <p className="text-sm font-semibold text-white">
            Notifications ({data.notifications.length})
          </p>
          {loading && <span className="text-[11px] text-slate-400">Maj...</span>}
          {data.notifications.length > 0 && (
            <button
              type="button"
              className="ml-auto inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-slate-200 transition hover:border-rose-300/70 hover:bg-rose-500/15 hover:text-rose-100"
              onClick={() => void deleteAll()}
              title="Supprimer toutes les notifications"
            >
              Tout supprimer
            </button>
          )}
        </div>
        <div className="max-h-[52vh] overflow-y-auto px-3 py-2">
          {data.notifications.length === 0 ? (
            <p className="text-xs text-slate-300">Aucune notification pour le moment.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {data.notifications.map((notif) => (
                <li key={notif.id} className="py-2">
                  <div
                    role="button"
                    tabIndex={0}
                    className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900/80 rounded-lg"
                    onClick={() => void markReadAndNavigate(notif)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void markReadAndNavigate(notif);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-white">{notif.title}</p>
                        {notif.body ? <p className="text-xs text-slate-300">{notif.body}</p> : null}
                        <p className="text-[11px] text-slate-500">{formatDate(notif.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!notif.readAt && <span className="mt-0.5 h-2 w-2 rounded-full bg-cyan-300" aria-hidden="true" />}
                        <button
                          type="button"
                          className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-slate-300 transition hover:border-rose-300/70 hover:bg-rose-500/15 hover:text-rose-100"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void deleteOne(notif);
                          }}
                          aria-label="Supprimer la notification"
                          title="Supprimer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
