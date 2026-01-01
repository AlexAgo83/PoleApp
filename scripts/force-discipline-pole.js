/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Force all courses and positions to use a single discipline (default: "Pole").
 * - Upserts the discipline for every school to avoid foreign mismatches in UI.
 * - Updates all Course.discipline and Position.discipline to the target value.
 *
 * Usage (local):
 *   DATABASE_URL=... node scripts/force-discipline-pole.js
 *
 * Optionally override the target name/color:
 *   TARGET_DISCIPLINE="Pole" TARGET_COLOR="#0ea5e9" DATABASE_URL=... node scripts/force-discipline-pole.js
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const name = process.env.TARGET_DISCIPLINE?.trim() || "Pole";
  const color = process.env.TARGET_COLOR?.trim() || "#7c3aed";

  const discipline = await prisma.discipline.upsert({
    where: { name },
    update: { color },
    create: { name, color },
  });

  const [courses, positions, presets] = await Promise.all([
    prisma.course.updateMany({ data: { discipline: name, disciplineId: discipline.id } }),
    prisma.position.updateMany({ data: { discipline: name, disciplineId: discipline.id } }),
    prisma.preset.updateMany({ data: { discipline: name, disciplineId: discipline.id } }),
  ]);

  console.log(`Discipline upserted globally.`);
  console.log(`Courses updated: ${courses.count}`);
  console.log(`Positions updated: ${positions.count}`);
  console.log(`Presets updated: ${presets.count}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
