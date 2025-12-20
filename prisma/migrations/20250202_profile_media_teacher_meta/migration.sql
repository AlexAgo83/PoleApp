-- Add optional avatar and diplomas to users
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT,
ADD COLUMN IF NOT EXISTS "diplomas" TEXT;

-- Favorite positions for teachers
CREATE TABLE IF NOT EXISTS "TeacherFavoritePosition" (
    "id" TEXT PRIMARY KEY,
    "teacherId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    CONSTRAINT "TeacherFavoritePosition_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeacherFavoritePosition_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "TeacherFavoritePosition_teacher_position_key" ON "TeacherFavoritePosition"("teacherId", "positionId");
CREATE INDEX IF NOT EXISTS "TeacherFavoritePosition_teacherId_idx" ON "TeacherFavoritePosition"("teacherId");
CREATE INDEX IF NOT EXISTS "TeacherFavoritePosition_positionId_idx" ON "TeacherFavoritePosition"("positionId");
