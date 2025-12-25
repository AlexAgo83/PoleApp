-- Muscles catalog and position linkage
CREATE TABLE "Muscle" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "kind" TEXT NOT NULL DEFAULT 'MUSCLE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "PositionMuscle" (
  "positionId" TEXT NOT NULL,
  "muscleId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PositionMuscle_pkey" PRIMARY KEY ("positionId", "muscleId"),
  CONSTRAINT "PositionMuscle_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PositionMuscle_muscleId_fkey" FOREIGN KEY ("muscleId") REFERENCES "Muscle"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
