"use client";

import { useEffect, useMemo, useState } from "react";

type RawSponsoredLink = { category?: unknown; label?: unknown; url?: unknown };
type SponsoredLink = { category: string; label?: string; url: string };

function normalizeLinks(raw: RawSponsoredLink[] | undefined): SponsoredLink[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => ({
      category: typeof s?.category === "string" ? s.category : "",
      label: typeof s?.label === "string" ? s.label : "",
      url: typeof s?.url === "string" ? s.url : "",
    }))
    .filter((s) => s.category || s.url);
}

export function SponsoredLinksField({
  name = "sponsored",
  initialLinks,
}: {
  name?: string;
  initialLinks?: RawSponsoredLink[];
}) {
  const [links, setLinks] = useState<SponsoredLink[]>(
    normalizeLinks(initialLinks?.length ? initialLinks : [{ category: "", label: "", url: "" }])
  );

  // Always ensure at least one row for UX
  useEffect(() => {
    if (links.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLinks([{ category: "", label: "", url: "" }]);
    }
  }, [links]);

  const serialized = useMemo(() => {
    const compact = links
      .map((l) => ({
        category: l.category.trim(),
        label: l.label?.trim() ?? "",
        url: l.url.trim(),
      }))
      .filter((l) => l.category || l.url);
    return JSON.stringify(compact);
  }, [links]);

  const updateLink = (index: number, field: keyof SponsoredLink, value: string) => {
    setLinks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeLink = (index: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const addLink = () => {
    setLinks((prev) => [...prev, { category: "", label: "", url: "" }]);
  };

  return (
    <div className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-slate-200">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.12em] text-cyan-200">Liens sponsorisés</p>
          <p className="text-slate-300">Catégorie, label optionnel, URL.</p>
        </div>
        <button
          type="button"
          onClick={addLink}
          className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/15"
        >
          Ajouter un lien
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {links.map((link, idx) => (
          <div
            key={idx}
            className="grid gap-2 rounded-lg border border-white/10 bg-black/10 p-2 md:grid-cols-3 md:items-center"
          >
            <input
              value={link.category}
              onChange={(e) => updateLink(idx, "category", e.target.value)}
              placeholder="Catégorie"
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white outline-none focus:border-cyan-400"
            />
            <input
              value={link.label ?? ""}
              onChange={(e) => updateLink(idx, "label", e.target.value)}
              placeholder="Label (optionnel)"
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white outline-none focus:border-cyan-400"
            />
            <div className="flex items-center gap-2">
              <input
                value={link.url}
                onChange={(e) => updateLink(idx, "url", e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white outline-none focus:border-cyan-400"
              />
              {links.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLink(idx)}
                  aria-label="Supprimer le lien"
                  className="rounded-full border border-red-400/40 bg-red-500/10 px-2 py-1 text-[11px] font-semibold text-red-100 transition hover:border-red-300/70 hover:bg-red-500/20"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <input type="hidden" name={name} value={serialized} readOnly />
    </div>
  );
}
