-- Create disciplines table (name + color per school)
CREATE TABLE "Discipline" (
  "id" TEXT PRIMARY KEY,
  "schoolId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#7c3aed',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Discipline_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Discipline_schoolId_name_key" UNIQUE ("schoolId","name")
);

-- Seed defaults for existing schools
INSERT INTO "Discipline" ("id","schoolId","name","color","createdAt")
SELECT 'disc_' || md5(random()::text), s."id", d.name, d.color, NOW()
FROM "School" s
CROSS JOIN (
  VALUES
    ('Pole', '#0ea5e9'),
    ('Exotic', '#ec4899'),
    ('Souplesse', '#a855f7'),
    ('Pilates', '#10b981')
) AS d(name, color)
ON CONFLICT ("schoolId","name") DO NOTHING;
