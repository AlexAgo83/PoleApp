import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const disciplines = await prisma.discipline.findMany({ select: { id: true, name: true } });
  const byName = new Map(disciplines.map((d) => [d.name.toLowerCase(), d.id]));

  const resolve = (name?: string | null) => {
    if (!name) return null;
    return byName.get(name.trim().toLowerCase()) ?? null;
  };

  const backfill = async <T extends { id: string; discipline: string | null; disciplineId: string | null }>(
    rows: T[],
    updater: (id: string, disciplineId: string) => Promise<unknown>,
  ) => {
    const toUpdate: Array<{ id: string; disciplineId: string }> = [];
    for (const row of rows) {
      if (row.disciplineId) continue;
      const match = resolve(row.discipline);
      if (match) {
        toUpdate.push({ id: row.id, disciplineId: match });
      }
    }
    for (const item of toUpdate) {
      await updater(item.id, item.disciplineId);
    }
    return toUpdate.length;
  };

  const positions = await prisma.position.findMany({ select: { id: true, discipline: true, disciplineId: true } });
  const courses = await prisma.course.findMany({ select: { id: true, discipline: true, disciplineId: true } });
  const presets = await prisma.preset.findMany({ select: { id: true, discipline: true, disciplineId: true } });

  const [positionsUpdated, coursesUpdated, presetsUpdated] = await Promise.all([
    backfill(positions, (id, disciplineId) => prisma.position.update({ where: { id }, data: { disciplineId } })),
    backfill(courses, (id, disciplineId) => prisma.course.update({ where: { id }, data: { disciplineId } })),
    backfill(presets, (id, disciplineId) => prisma.preset.update({ where: { id }, data: { disciplineId } })),
  ]);

  console.log(
    `Backfill terminé : positions=${positionsUpdated}, cours=${coursesUpdated}, presets=${presetsUpdated} (disciplineId)`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
