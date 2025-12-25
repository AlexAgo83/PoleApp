/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DEFAULT_DISCIPLINES = [
  { name: "Pole", color: "#0ea5e9" },
  { name: "Exotic", color: "#ec4899" },
  { name: "Souplesse", color: "#a855f7" },
  { name: "Pilates", color: "#10b981" },
  { name: "Danse", color: "#7c3aed" },
];

async function run() {
  const schools = await prisma.school.findMany({ select: { id: true, name: true } });
  console.log(`Found ${schools.length} school(s) to backfill disciplines.`);

  for (const school of schools) {
    console.log(`\nSchool: ${school.name} (${school.id})`);
    for (const disc of DEFAULT_DISCIPLINES) {
      const upserted = await prisma.discipline.upsert({
        where: { schoolId_name: { schoolId: school.id, name: disc.name } },
        update: { color: disc.color },
        create: { schoolId: school.id, name: disc.name, color: disc.color },
      });
      console.log(` - ${upserted.name} (${upserted.color})`);
    }
  }
}

run()
  .catch((err) => {
    console.error("Backfill failed", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
