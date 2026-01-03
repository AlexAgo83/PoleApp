import fs from "fs";
import path from "path";
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

  const resolvedParams = await (searchParams ?? Promise.resolve({}));
  const getValue = (value?: string | string[]) => (Array.isArray(value) ? value[0] : value);
  const sectionParam = (getValue(resolvedParams.section) ?? "").toLowerCase();
  const fileParam = getValue(resolvedParams.file) ?? "";
  const selectedCategory =
    docsByCategory.find((c) => c.key === sectionParam) ?? docsByCategory[docsByCategory.length - 1] ?? null;
  const defaultDoc =
    selectedCategory && selectedCategory.docs.length > 0
      ? selectedCategory.docs[selectedCategory.docs.length - 1]
      : null;
  const selectedDoc = selectedCategory?.docs.find((doc) => doc.slug === fileParam) ?? defaultDoc;

  const content = selectedDoc ? fs.readFileSync(selectedDoc.path, "utf-8") : null;

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
          <pre className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{content}</pre>
        ) : (
          <p className="text-sm text-slate-300">Choisis un fichier pour afficher son contenu.</p>
        )}
      </section>
    </main>
  );
}
