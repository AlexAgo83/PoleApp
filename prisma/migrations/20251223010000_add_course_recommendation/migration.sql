-- Ensure enum exists (Render DB may not have it yet)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SuggestionTag') THEN
        CREATE TYPE "SuggestionTag" AS ENUM ('DISCOVERY', 'REVISION', 'SAFE');
    END IF;
END $$;

-- CreateTable
CREATE TABLE "CourseRecommendation" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "tag" "SuggestionTag" NOT NULL,
    "reason" TEXT,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseRecommendation_courseId_positionId_key" ON "CourseRecommendation"("courseId", "positionId");

-- CreateIndex
CREATE INDEX "CourseRecommendation_courseId_idx" ON "CourseRecommendation"("courseId");

-- AddForeignKey
ALTER TABLE "CourseRecommendation" ADD CONSTRAINT "CourseRecommendation_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseRecommendation" ADD CONSTRAINT "CourseRecommendation_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
