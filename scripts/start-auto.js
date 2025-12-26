/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");

const mode = process.argv[2] === "render" ? "render" : "dev";
// Turbopack panics locally: default to webpack unless explicitly enabled.
process.env.NEXT_USE_TURBOPACK = process.env.NEXT_USE_TURBOPACK ?? "0";

function run(cmd, opts = {}) {
  console.log(`\n>>> ${cmd}`);
  execSync(cmd, { stdio: "inherit", ...opts });
}

async function checkDbState() {
  const prisma = new PrismaClient();
  try {
    const [{ userCount }] = await prisma.$queryRawUnsafe(
      'SELECT COUNT(*)::int AS "userCount" FROM "User";'
    );
    const [{ schoolCount }] = await prisma.$queryRawUnsafe(
      'SELECT COUNT(*)::int AS "schoolCount" FROM "School";'
    );
    // Considère la DB vide si aucune école et aucun utilisateur métier (ignore un éventuel super-admin seul)
    if (schoolCount === 0 && userCount <= 1) return "empty";
    return "ready";
  } catch (err) {
    // Likely missing tables/schema
    console.warn("checkDbState: missing tables or query failed:", err.message || err);
    return "missing";
  } finally {
    await prisma.$disconnect();
  }
}

async function ensureSchemaAndSeed() {
  const preferDbPush = true;

  if (preferDbPush) {
    run("npm run db:push");
  } else {
    // Try migrate deploy, fallback to db:push on typical bootstrap failures
    try {
      run("npm run db:migrate:deploy");
    } catch (err) {
      const msg = String(err?.stderr || err?.stdout || err?.message || "");
      console.warn("Migration deploy failed, attempting db:push instead.");
      console.warn(msg);
      run("npm run db:push");
    }
  }

  const state = await checkDbState();
  console.log(`DB state after schema sync: ${state}`);
  // Régénérer le client Prisma après migration/push
  run("npx prisma generate");

  if (state === "missing") {
    run("npm run db:push");
    run("npx tsx prisma/seed.ts");
  } else if (state === "empty") {
    run("npx tsx prisma/seed.ts");
  } else {
    console.log("Database already seeded, skipping seed.");
  }

  // Post-check: fail fast if toujours vide
  const finalState = await checkDbState();
  console.log(`DB state after seed: ${finalState}`);
  if (finalState !== "ready") {
    throw new Error("Database is still empty after seed; aborting start.");
  }
}

async function main() {
  await ensureSchemaAndSeed();
  if (mode === "render") {
    run("npm run start");
  } else {
    run("npm run dev -- --hostname 0.0.0.0 --port 3000");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
