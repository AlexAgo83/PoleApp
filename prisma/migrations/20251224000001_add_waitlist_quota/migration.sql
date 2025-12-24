-- Add waitlist quota per course (0 = illimité)
ALTER TABLE "Course"
ADD COLUMN "waitlistQuota" INTEGER NOT NULL DEFAULT 0;
