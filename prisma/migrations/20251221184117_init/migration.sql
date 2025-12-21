-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'TEACHER', 'SCHOOL_ADMIN');

-- CreateEnum
CREATE TYPE "PositionType" AS ENUM ('SPIN', 'TRICK', 'TRANSITION', 'WARMUP', 'STRENGTH');

-- CreateEnum
CREATE TYPE "PositionLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('PHOTO', 'VIDEO');

-- CreateEnum
CREATE TYPE "LearningStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PASSED', 'MASTERED');

-- CreateEnum
CREATE TYPE "MasteryLevel" AS ENUM ('INITIATED', 'PASSED', 'FLUID', 'CHOREO');

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "age" INTEGER,
    "avatarUrl" TEXT,
    "diplomas" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "credits" INTEGER NOT NULL DEFAULT 0,
    "schoolId" TEXT,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "levelRequired" "PositionLevel" NOT NULL,
    "type" "PositionType" NOT NULL,
    "grips" TEXT,
    "tips" TEXT,
    "contraindications" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionMedia" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PositionMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InjuryType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InjuryType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentInjury" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "injuryTypeId" TEXT NOT NULL,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentInjury_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentPositionProgress" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "learningStatus" "LearningStatus" NOT NULL,
    "masteryLevel" "MasteryLevel",
    "comment" TEXT,
    "lastUpdatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentPositionProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "studioId" TEXT,
    "title" TEXT,
    "photoUrl" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 60,
    "maxSeats" INTEGER NOT NULL DEFAULT 30,
    "costCredits" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseAttendance" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "CourseAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoursePosition" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,

    CONSTRAINT "CoursePosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseNote" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "masteryLevel" "MasteryLevel" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Studio" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Studio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'SERVICE',
    "website" TEXT,
    "description" TEXT,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsoredLink" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "label" TEXT,
    "url" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SponsoredLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherFavoritePosition" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,

    CONSTRAINT "TeacherFavoritePosition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_name_key" ON "School"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_isPremium_idx" ON "User"("role", "isPremium");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_name_idx" ON "User"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Position_name_key" ON "Position"("name");

-- CreateIndex
CREATE UNIQUE INDEX "InjuryType_name_key" ON "InjuryType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "StudentPositionProgress_studentId_positionId_key" ON "StudentPositionProgress"("studentId", "positionId");

-- CreateIndex
CREATE INDEX "Course_schoolId_date_idx" ON "Course"("schoolId", "date");

-- CreateIndex
CREATE INDEX "Course_teacherId_idx" ON "Course"("teacherId");

-- CreateIndex
CREATE INDEX "Course_studioId_idx" ON "Course"("studioId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseAttendance_courseId_studentId_key" ON "CourseAttendance"("courseId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "CoursePosition_courseId_positionId_key" ON "CoursePosition"("courseId", "positionId");

-- CreateIndex
CREATE UNIQUE INDEX "CourseNote_courseId_studentId_positionId_key" ON "CourseNote"("courseId", "studentId", "positionId");

-- CreateIndex
CREATE INDEX "Studio_schoolId_idx" ON "Studio"("schoolId");

-- CreateIndex
CREATE INDEX "Partner_schoolId_idx" ON "Partner"("schoolId");

-- CreateIndex
CREATE INDEX "SponsoredLink_partnerId_idx" ON "SponsoredLink"("partnerId");

-- CreateIndex
CREATE INDEX "TeacherFavoritePosition_teacherId_idx" ON "TeacherFavoritePosition"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherFavoritePosition_positionId_idx" ON "TeacherFavoritePosition"("positionId");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherFavoritePosition_teacherId_positionId_key" ON "TeacherFavoritePosition"("teacherId", "positionId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionMedia" ADD CONSTRAINT "PositionMedia_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentInjury" ADD CONSTRAINT "StudentInjury_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentInjury" ADD CONSTRAINT "StudentInjury_injuryTypeId_fkey" FOREIGN KEY ("injuryTypeId") REFERENCES "InjuryType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPositionProgress" ADD CONSTRAINT "StudentPositionProgress_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPositionProgress" ADD CONSTRAINT "StudentPositionProgress_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPositionProgress" ADD CONSTRAINT "StudentPositionProgress_lastUpdatedByUserId_fkey" FOREIGN KEY ("lastUpdatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseAttendance" ADD CONSTRAINT "CourseAttendance_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseAttendance" ADD CONSTRAINT "CourseAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePosition" ADD CONSTRAINT "CoursePosition_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoursePosition" ADD CONSTRAINT "CoursePosition_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseNote" ADD CONSTRAINT "CourseNote_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseNote" ADD CONSTRAINT "CourseNote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseNote" ADD CONSTRAINT "CourseNote_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Studio" ADD CONSTRAINT "Studio_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsoredLink" ADD CONSTRAINT "SponsoredLink_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherFavoritePosition" ADD CONSTRAINT "TeacherFavoritePosition_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherFavoritePosition" ADD CONSTRAINT "TeacherFavoritePosition_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
