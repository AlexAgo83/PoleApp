-- Add optional age to users (students can expose/edit their age)
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "age" INTEGER;
