-- Harmonize mastery levels to: NOVELTY / INITIATED / PASSED / FLUID_CHOREO
-- Preserve existing data while merging FLUID/CHOREO into FLUID_CHOREO and keeping nulls.

-- 1) Rename current type and create the new canonical one
ALTER TYPE "MasteryLevel" RENAME TO "MasteryLevel_old";
CREATE TYPE "MasteryLevel" AS ENUM ('NOVELTY', 'INITIATED', 'PASSED', 'FLUID_CHOREO');

-- 2) Migrate columns
ALTER TABLE "StudentPositionProgress"
  ALTER COLUMN "masteryLevel" TYPE "MasteryLevel" USING (
    CASE
      WHEN "masteryLevel" IS NULL THEN NULL
      WHEN "masteryLevel" IN ('FLUID', 'CHOREO', 'FLUID_CHOREO') THEN 'FLUID_CHOREO'::"MasteryLevel"
      WHEN "masteryLevel" = 'PASSED' THEN 'PASSED'::"MasteryLevel"
      WHEN "masteryLevel" = 'INITIATED' THEN 'INITIATED'::"MasteryLevel"
      WHEN "masteryLevel" = 'NOVELTY' THEN 'NOVELTY'::"MasteryLevel"
      ELSE 'NOVELTY'::"MasteryLevel"
    END
  );

ALTER TABLE "CourseNote"
  ALTER COLUMN "masteryLevel" TYPE "MasteryLevel" USING (
    CASE
      WHEN "masteryLevel" IN ('FLUID', 'CHOREO', 'FLUID_CHOREO') THEN 'FLUID_CHOREO'::"MasteryLevel"
      WHEN "masteryLevel" = 'PASSED' THEN 'PASSED'::"MasteryLevel"
      WHEN "masteryLevel" = 'INITIATED' THEN 'INITIATED'::"MasteryLevel"
      WHEN "masteryLevel" = 'NOVELTY' THEN 'NOVELTY'::"MasteryLevel"
      ELSE 'NOVELTY'::"MasteryLevel"
    END
  );

-- 3) Drop old type
DROP TYPE "MasteryLevel_old";
