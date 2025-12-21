const { execSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");

const mode = process.argv[2] === "render" ? "render" : "dev";

function run(cmd, opts = {}) {
  console.log(`\n>>> ${cmd}`);
  execSync(cmd, { stdio: "inherit", ...opts });
}

async function checkDbState() {
  const prisma = new PrismaClient();
  try {
    const [{ count }] = await prisma.$queryRawUnsafe(
      'SELECT COUNT(*)::int AS count FROM "User";'
    );
    return count === 0 ? "empty" : "ready";
  } catch (err) {
    // Likely missing tables/schema
    return "missing";
  } finally {
    await prisma.$disconnect();
  }
}

async function ensureSchemaAndSeed() {
  // Try migrate deploy, fallback to db:push on typical bootstrap failures
  try {
    run("npm run db:migrate:deploy");
  } catch (err) {
    const msg = String(err?.stderr || err?.stdout || err?.message || "");
    console.warn("Migration deploy failed, attempting db:push instead.");
    console.warn(msg);
    run("npm run db:push");
  }

  const state = await checkDbState();
  if (state === "missing") {
    run("npm run db:push");
    run("npm run db:seed");
  } else if (state === "empty") {
    run("npm run db:seed");
  } else {
    console.log("Database already seeded, skipping seed.");
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
