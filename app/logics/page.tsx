import fs from "fs";
import path from "path";
import React from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { FoxPageHeader } from "@/components/FoxPageHeader";

export const dynamic = "force-dynamic";

type Category = {
  key: string;
  label: string;
  dir: string;
  filter?: (file: string) => boolean;
};

type DocMeta = {
  slug: string;
  title: string;
  path: string;
};

const CATEGORIES: Category[] = [
  { key: "backlog", label: "Backlog", dir: path.join(process.cwd(), "logics", "backlog") },
  {
    key: "discovery-qa",
    label: "Discovery QA",
    dir: path.join(process.cwd(), "logics", "discovery"),
    filter: (file) => file.startsWith("06_QA_"),
  },
  {
    key: "discovery-qe",
    label: "Discovery QE",
    dir: path.join(process.cwd(), "logics", "discovery"),
    filter: (file) => file.startsWith("07_QE_"),
  },
  { key: "foundry", label: "Foundry", dir: path.join(process.cwd(), "logics", "foundry") },
  { key: "instructions", label: "Instructions", dir: path.join(process.cwd(), "logics", "instructions") },
  { key: "knowledge", label: "Knowledge", dir: path.join(process.cwd(), "logics", "knowledge") },
  { key: "models", label: "Models", dir: path.join(process.cwd(), "logics", "models") },
];

function formatTitle(file: string) {
  return file.replace(/^01_/, "").replace(/_/g, " ").replace(/\.md$/i, "");
}

function listDocs(category: Category): DocMeta[] {
  if (!fs.existsSync(category.dir)) return [];
  const entries = fs
    .readdirSync(category.dir)
    .filter((file) => file.endsWith(".md"))
    .filter((file) => (category.filter ? category.filter(file) : true));
  return entries
    .sort()
    .map((file) => ({
      slug: file.replace(/\.md$/i, ""),
      title: formatTitle(file),
      path: path.join(category.dir, file),
    }));
}

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function LogicsPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "SUPER_ADMIN") {
    redirect("/access-denied");
  }

  const docsByCategory = CATEGORIES.map((cat) => ({
    ...cat,
    docs: listDocs(cat),
  })).filter((c) => c.docs.length > 0);

  const resolvedParams = (await (searchParams ?? Promise.resolve({}))) as Record<
    string,
    string | string[] | undefined
  >;
  const getValue = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);
  const sectionParam = (getValue(resolvedParams.section) ?? "").toLowerCase();
  const fileParam = getValue(resolvedParams.file) ?? "";
  const selectedCategory = docsByCategory.find((c) => c.key === sectionParam) ?? docsByCategory[0] ?? null;
  const defaultDoc = selectedCategory && selectedCategory.docs.length > 0 ? selectedCategory.docs[0] : null;
  const selectedDoc = selectedCategory?.docs.find((doc) => doc.slug === fileParam) ?? defaultDoc;

  const content = selectedDoc ? fs.readFileSync(selectedDoc.path, "utf-8") : null;

  const renderMarkdown = (raw: string) => {
    const elements: React.ReactNode[] = [];
    let listItems: { content: string; isTask: boolean; checked?: boolean }[] = [];

    const renderInline = (text: string, keyPrefix: string) => {
      const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
      return parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={`${keyPrefix}-${i}`} className="text-white">
            {part.replace(/\*\*/g, "")}
          </strong>
        ) : (
          <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>
        ),
      );
    };

    const flushList = () => {
      if (listItems.length > 0) {
        const taskOnly = listItems.every((item) => item.isTask);
        elements.push(
          <ul
            key={`ul-${elements.length}`}
            className={`${taskOnly ? "space-y-1 pl-1" : "list-disc space-y-1 pl-5"} text-sm text-slate-200`}
          >
            {listItems.map((item, idx) => (
              <li key={`li-${elements.length}-${idx}`} className={item.isTask ? "list-none" : "leading-relaxed"}>
                {item.isTask ? (
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded border text-[10px] font-semibold ${
                        item.checked
                          ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100"
                          : "border-white/20 bg-white/5 text-slate-300"
                      }`}
                    >
                      {item.checked ? "✓" : ""}
                    </span>
                    <span className="leading-relaxed">
                      {renderInline(item.content, `task-${elements.length}-${idx}`)}
                    </span>
                  </div>
                ) : (
                  <span className="leading-relaxed">
                    {renderInline(item.content, `li-${elements.length}-${idx}`)}
                  </span>
                )}
              </li>
            ))}
          </ul>,
        );
        listItems = [];
      }
    };

    const renderText = (line: string, idx: number) => {
      const isMetaLine = /\[.*(Compréhension|Confiance)/i.test(line);
      if (isMetaLine) {
        const cleaned = line.replace(/^[\[\(]\s*/, "").replace(/[\]\)]\s*$/, "");
        const parts = cleaned.split(/\s*[|/]\s*/).filter(Boolean);
        if (parts.length > 0) {
          return (
            <div key={`badge-${idx}`} className="flex flex-wrap gap-2">
              {parts.map((part, i) => (
                <span
                  key={`badge-${idx}-${i}`}
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2 py-1 text-xs font-semibold text-cyan-100"
                >
                  {part}
                </span>
              ))}
            </div>
          );
        }
      }
      const isQuote = line.startsWith(">");
      const normalized = isQuote ? line.replace(/^>\s?/, "") : line;
      const Wrapper = isQuote ? "em" : React.Fragment;
      const textClass = isQuote ? "text-cyan-200" : "text-slate-200";
      return (
        <p key={`p-${idx}`} className={`whitespace-pre-wrap text-sm leading-relaxed ${textClass}`}>
          <Wrapper>{renderInline(normalized, `p-${idx}`)}</Wrapper>
        </p>
      );
    };

    raw.split(/\r?\n/).forEach((line, idx) => {
      const trimmed = line.trimStart();
      const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
      if (heading) {
        flushList();
        const level = heading[1].length;
        const text = heading[2].trim();
        const HeadingTag = `h${Math.min(level, 3)}` as keyof React.JSX.IntrinsicElements;
        elements.push(
          <HeadingTag
            key={`h-${idx}`}
            className={`font-semibold text-white ${
              level === 1 ? "text-2xl" : level === 2 ? "text-xl" : "text-lg"
            } mt-2`}
          >
            {text}
          </HeadingTag>,
        );
        return;
      }

      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const itemText = trimmed.replace(/^[-*]\s+/, "");
        const taskMatch = itemText.match(/^\[([ xX])\]\s+(.*)$/);
        if (taskMatch) {
          listItems.push({
            content: taskMatch[2],
            isTask: true,
            checked: taskMatch[1].toLowerCase() === "x",
          });
        } else {
          listItems.push({ content: itemText, isTask: false });
        }
        return;
      }

      if (trimmed.length === 0) {
        flushList();
        elements.push(<div key={`spacer-${idx}`} className="h-2" />);
        return;
      }

      flushList();
      elements.push(renderText(trimmed, idx));
    });

    flushList();
    return elements;
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-2 pt-0 pb-2 md:px-8 md:pt-0 md:pb-4">
      <FoxPageHeader
        eyebrow="Super admin"
        title="Logics"
        buttons={[
          { label: "Accueil super admin", href: "/super-admin" },
          { label: "Déconnexion", href: "/api/auth/signout" },
        ]}
        foxHref="/"
      />

      <section className="panel space-y-3 p-5">
        <h1 className="text-2xl font-semibold text-white">Navigation</h1>
        <p className="text-sm text-slate-300">Choisis une section puis un fichier pour afficher son contenu.</p>
        <div className="flex flex-wrap gap-2">
          {docsByCategory.map((cat) => (
            <a
              key={cat.key}
              href={`?section=${cat.key}`}
              className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
                selectedCategory?.key === cat.key
                  ? "border-cyan-400/70 bg-cyan-500/20 text-cyan-100"
                  : "border-white/10 bg-white/5 text-slate-100 hover:border-cyan-400/60 hover:text-cyan-200"
              }`}
            >
              {cat.label}
            </a>
          ))}
        </div>

        {selectedCategory ? (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">{selectedCategory.label}</p>
            <div className="flex flex-wrap gap-2">
              {selectedCategory.docs.map((doc) => (
                <a
                  key={doc.slug}
                  href={`?section=${selectedCategory.key}&file=${doc.slug}`}
                  className={`rounded-lg border px-3 py-2 text-sm transition ${
                    selectedDoc?.slug === doc.slug
                      ? "border-cyan-400/70 bg-cyan-500/15 text-cyan-100"
                      : "border-white/10 bg-white/5 text-slate-100 hover:border-cyan-400/60 hover:text-cyan-200"
                  }`}
                >
                  {doc.title}
                </a>
              ))}
              {selectedCategory.docs.length === 0 && (
                <span className="text-sm text-slate-300">Aucun fichier dans cette section.</span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-300">Aucune section disponible dans /logics.</p>
        )}
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="text-xl font-semibold text-white">
          {selectedDoc ? selectedDoc.title : "Aucun fichier sélectionné"}
        </h2>
        {content ? (
          <div className="space-y-2">{renderMarkdown(content)}</div>
        ) : (
          <p className="text-sm text-slate-300">Choisis un fichier pour afficher son contenu.</p>
        )}
      </section>
    </main>
  );
}
