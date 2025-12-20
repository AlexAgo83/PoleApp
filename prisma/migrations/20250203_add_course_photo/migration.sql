-- Add optional photo to courses
ALTER TABLE "Course"
ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;
