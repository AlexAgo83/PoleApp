/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const CATALOG = [
  { name: "Épaules", kind: "ARTICULATION" },
  { name: "Coudes", kind: "ARTICULATION" },
  { name: "Poignets", kind: "ARTICULATION" },
  { name: "Dos", kind: "MUSCLE" },
  { name: "Lombaires", kind: "MUSCLE" },
  { name: "Abdos", kind: "MUSCLE" },
  { name: "Tronc", kind: "MUSCLE" },
  { name: "Hanches", kind: "ARTICULATION" },
  { name: "Fessiers", kind: "MUSCLE" },
  { name: "Quadriceps", kind: "MUSCLE" },
  { name: "Ischios", kind: "MUSCLE" },
  { name: "Adducteurs", kind: "MUSCLE" },
  { name: "Genoux", kind: "ARTICULATION" },
  { name: "Chevilles", kind: "ARTICULATION" },
  { name: "Biceps", kind: "MUSCLE" },
  { name: "Triceps", kind: "MUSCLE" },
  { name: "Avant-bras", kind: "MUSCLE" },
  { name: "Trapèzes", kind: "MUSCLE" },
  { name: "Cervicales", kind: "ARTICULATION" },
];

async function run() {
  console.log(`Upserting ${CATALOG.length} muscles/articulations...`);
  for (const item of CATALOG) {
    const upserted = await prisma.muscle.upsert({
      where: { name: item.name },
      update: { kind: item.kind },
      create: { name: item.name, kind: item.kind },
    });
    console.log(`- ${upserted.name} (${upserted.kind})`);
  }
}

run()
  .catch((err) => {
    console.error("Backfill muscles failed", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
