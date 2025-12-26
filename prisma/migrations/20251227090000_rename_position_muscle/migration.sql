-- Rename relation table from PositionMuscle to PositionTarget (muscles/articulations)
ALTER TABLE "PositionMuscle" RENAME TO "PositionTarget";
ALTER INDEX "PositionMuscle_pkey" RENAME TO "PositionTarget_pkey";
ALTER INDEX "PositionMuscle_positionId_muscleId_key" RENAME TO "PositionTarget_positionId_muscleId_key";
