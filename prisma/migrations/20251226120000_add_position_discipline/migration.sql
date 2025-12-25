-- Add discipline to positions to align with course disciplines
ALTER TABLE "Position"
ADD COLUMN "discipline" TEXT NOT NULL DEFAULT 'Danse';
