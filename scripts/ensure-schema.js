/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

function parseDatabaseUrl(rawUrl) {
  const trimmed = rawUrl?.trim();
  if (!trimmed) {
    throw new Error("DATABASE_URL is not set; cannot ensure schema.");
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

async function ensureSchema(schema) {
  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe('SET search_path TO "public"');
    await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const { schema, dbName } = parseDatabaseUrl(process.env.DATABASE_URL);
  console.log(`Ensuring schema "${schema}" exists on database "${dbName}"...`);
  await ensureSchema(schema);
  console.log(`Schema "${schema}" ensured.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
