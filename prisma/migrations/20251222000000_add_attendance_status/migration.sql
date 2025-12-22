-- Add AttendanceStatus enum
CREATE TYPE "AttendanceStatus" AS ENUM ('CONFIRMED', 'WAITLIST');

-- Add columns on CourseAttendance
ALTER TABLE "CourseAttendance"
  ADD COLUMN "status" "AttendanceStatus" NOT NULL DEFAULT 'CONFIRMED',
  ADD COLUMN "waitlistRank" INTEGER,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
