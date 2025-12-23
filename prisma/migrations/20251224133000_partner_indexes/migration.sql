-- Add indexes to speed partner filters and event rollups
CREATE INDEX IF NOT EXISTS "Partner_schoolId_kind_idx" ON "Partner"("schoolId", "kind");
CREATE INDEX IF NOT EXISTS "PartnerEvent_partnerId_createdAt_idx" ON "PartnerEvent"("partnerId", "createdAt");
