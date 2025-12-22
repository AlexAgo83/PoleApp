-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PartnerEventType') THEN
        CREATE TYPE "PartnerEventType" AS ENUM ('CLICK', 'PURCHASE');
    END IF;
END $$;

-- CreateTable
CREATE TABLE "PartnerEvent" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "userId" TEXT,
    "courseId" TEXT,
    "studioId" TEXT,
    "type" "PartnerEventType" NOT NULL DEFAULT 'CLICK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PartnerEvent_partnerId_idx" ON "PartnerEvent"("partnerId");

-- CreateIndex
CREATE INDEX "PartnerEvent_userId_idx" ON "PartnerEvent"("userId");

-- CreateIndex
CREATE INDEX "PartnerEvent_courseId_idx" ON "PartnerEvent"("courseId");

-- CreateIndex
CREATE INDEX "PartnerEvent_studioId_idx" ON "PartnerEvent"("studioId");

-- AddForeignKey
ALTER TABLE "PartnerEvent" ADD CONSTRAINT "PartnerEvent_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerEvent" ADD CONSTRAINT "PartnerEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerEvent" ADD CONSTRAINT "PartnerEvent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerEvent" ADD CONSTRAINT "PartnerEvent_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
