-- Add discipline with default "Danse" to courses
ALTER TABLE "Course"
ADD COLUMN "discipline" TEXT NOT NULL DEFAULT 'Danse';
