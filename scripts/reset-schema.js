/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config();
const { execSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");

function run(cmd) {
  console.log(`\n>>> ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
}

function parseDatabaseUrl(rawUrl) {
  const trimmed = rawUrl?.trim();
  if (!trimmed) {
    throw new Error("DATABASE_URL is not set; cannot reset schema.");
  }

  const urlText = trimmed.startsWith("EXTERNAL=")
    ? trimmed.slice("EXTERNAL=".length)
    : trimmed;
  const url = new URL(urlText);
  const schema = url.searchParams.get("schema") || "public";
  const dbName = url.pathname.replace(/^\//, "") || "(default)";

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
    throw new Error(`Unsafe schema name "${schema}". Use alphanumerics/underscore and start with a letter.`);
  }

  return { schema, dbName };
}

async function dropAndRecreateSchema(schema) {
  const prisma = new PrismaClient();
  try {
    // Set search_path away from the target schema before dropping it.
    await prisma.$executeRawUnsafe('SET search_path TO "public"');
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await prisma.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const { schema, dbName } = parseDatabaseUrl(process.env.DATABASE_URL);
  const force =
    process.env.SCHEMA_RESET_FORCE === "true" || process.env.SCHEMA_RESET_FORCE === "1";
  const isProd = process.env.NODE_ENV === "production";

  if ((isProd || schema === "public") && !force) {
    throw new Error(
      `Refusing to reset schema "${schema}" because ${isProd ? "NODE_ENV=production" : "schema is public"}. Set SCHEMA_RESET_FORCE=1 to override.`
    );
  }

  console.log(`Resetting schema "${schema}" on database "${dbName}"...`);
  await dropAndRecreateSchema(schema);
  console.log(`Schema "${schema}" dropped and recreated.`);

  console.log("Re-applying Prisma schema (db push)...");
  run("npm run db:push");

  console.log("Seeding schema...");
  run("npm run db:seed");

  console.log(`Schema "${schema}" reset complete.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
