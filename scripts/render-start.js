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
    if (userCount > 0) {
      return;
    }
    const dumpPath = pickDumpPath();
    if (dumpPath) {
      try {
        console.log(`Seed via dump : ${dumpPath}`);
        run(`psql "${process.env.DATABASE_URL}" -f ${dumpPath}`);
        return;
      } catch (err) {
        console.warn("Seed via dump a échoué, on tente le seed Prisma classique.", err?.message);
      }
    }
    run("npm run db:seed");
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  try {
    run("npm run db:migrate:deploy");
  } catch (err) {
    const output = (err?.stderr || err?.stdout || "").toString();
    if (output.includes("P3005")) {
      console.warn("P3005 detected: falling back to `npm run db:push`");
      run("npm run db:push");
    } else {
      throw err;
    }
  }

  await seedIfEmpty();
  run("npm run start");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
