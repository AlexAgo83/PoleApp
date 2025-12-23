import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const run = (cmd) => execSync(cmd, { stdio: "inherit", env: process.env });

function pickDumpPath() {
  if (process.env.SEED_DUMP_PATH && fs.existsSync(process.env.SEED_DUMP_PATH)) {
    return process.env.SEED_DUMP_PATH;
  }
  const scriptsDir = path.join(process.cwd(), "scripts");
  const files = fs.readdirSync(scriptsDir);
  const dumpCandidates = files
    .filter((f) => /^backup_\d+\.sql$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/\d+/)?.[0] ?? "0", 10);
      const nb = parseInt(b.match(/\d+/)?.[0] ?? "0", 10);
      return nb - na; // décroissant
    });
  if (dumpCandidates.length > 0) {
    return path.join(scriptsDir, dumpCandidates[0]);
  }
  const fallback = path.join(scriptsDir, "backup.sql");
  return fs.existsSync(fallback) ? fallback : null;
}

async function seedIfEmpty() {
  const prisma = new PrismaClient();
  try {
    const userCount = await prisma.user.count();
    if (userCount > 0) return;

    const dumpPath = pickDumpPath();
    if (dumpPath) {
      try {
        console.log(`Seed via dump : ${dumpPath}`);
        run(`psql "${process.env.DATABASE_URL}" -f ${dumpPath}`);
        return;
      } catch (err) {
        console.warn("Seed via dump a échoué, fallback seed Prisma.", err?.message);
      }
    }
    run("npm run db:seed");
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  // En dev, on reste sur db:push pour rester permissif
  run("npm run db:push");
  await seedIfEmpty();
  run('npm run dev -- --hostname 0.0.0.0 --port 3000');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
