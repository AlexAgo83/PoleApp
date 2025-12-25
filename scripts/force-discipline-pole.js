/* eslint-disable @typescript-eslint/no-var-requires */
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

  const schools = await prisma.school.findMany({ select: { id: true } });
  for (const school of schools) {
    await prisma.discipline.upsert({
      where: { schoolId_name: { schoolId: school.id, name } },
      update: { color },
      create: { schoolId: school.id, name, color },
    });
  }

  const [courses, positions] = await Promise.all([
    prisma.course.updateMany({ data: { discipline: name } }),
    prisma.position.updateMany({ data: { discipline: name } }),
  ]);

  console.log(`Discipline upserted for ${schools.length} school(s).`);
  console.log(`Courses updated: ${courses.count}`);
  console.log(`Positions updated: ${positions.count}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
