"use client";

import { useEffect, useRef } from "react";

type PartnerProduct = {
  id: string;
  partnerName: string;
  partnerKind?: string | null;
  category?: string | null;
  label?: string | null;
  url: string;
};

export function PartnerProductsCarousel({ items }: { items: PartnerProduct[] }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  if (!items.length) return null;

  const scrollByCard = (direction: -1 | 1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const firstCard = scroller.querySelector<HTMLElement>("[data-product-card]");
    const delta = (firstCard?.clientWidth ?? 240) + 16; // include gap
    scroller.scrollBy({ left: delta * direction, behavior: "smooth" });
  };

  useEffect(() => {
    if (items.length <= 1) return undefined;
    const id = window.setInterval(() => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const firstCard = scroller.querySelector<HTMLElement>("[data-product-card]");
      const delta = (firstCard?.clientWidth ?? 240) + 16;
      const maxScroll = scroller.scrollWidth - scroller.clientWidth;
      const nextLeft = scroller.scrollLeft + delta;
      if (nextLeft >= maxScroll - 4) {
        scroller.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scroller.scrollBy({ left: delta, behavior: "smooth" });
      }
    }, 3800);
    return () => window.clearInterval(id);
  }, [items.length]);

  return (
    <div className="relative mt-5 w-full overflow-hidden">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Produits partenaires</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-sm font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10"
            aria-label="Reculer"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-sm font-semibold text-white transition hover:border-cyan-300/70 hover:bg-white/10"
            aria-label="Avancer"
          >
            →
          </button>
        </div>
      </div>
      <div className="relative w-full min-w-0 overflow-hidden">
        <div
          ref={scrollerRef}
          className="grid w-full max-w-full auto-cols-[minmax(240px,280px)] grid-flow-col gap-3 overflow-x-auto py-2 pr-1"
          style={{ scrollSnapType: "x mandatory" }}
          role="list"
          aria-label="Produits partenaires"
        >
          {items.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              role="listitem"
              data-product-card
              className="group relative flex min-w-[240px] max-w-[280px] shrink-0 snap-start flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200 transition hover:border-cyan-300/70 hover:bg-white/10"
              style={{ scrollSnapAlign: "start" }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-200">
                  {item.category || "Offre"}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-white/80">
                  {item.partnerKind ?? "Partenaire"}
                </span>
              </div>
              <p className="text-base font-semibold text-white">
                {item.label || "Produit partenaire"}
              </p>
              <p className="text-xs text-slate-400">par {item.partnerName}</p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-cyan-300 transition group-hover:text-cyan-100">
                Voir l&apos;offre ↗
              </span>
            </a>
          ))}
        </div>
        {/* No gradient overlays to avoid mismatch with panel background */}
      </div>
    </div>
  );
}
