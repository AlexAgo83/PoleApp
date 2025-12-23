-- AlterTable
ALTER TABLE "CourseRecommendation" ADD COLUMN     "excludedForInjury" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "CourseRecommendation" ADD COLUMN     "forced" BOOLEAN NOT NULL DEFAULT false;
