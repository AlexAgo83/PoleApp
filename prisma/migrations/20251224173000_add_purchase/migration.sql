-- Purchases (simulated paid)
CREATE TABLE "Purchase" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "offerId" TEXT NOT NULL,
  "offerName" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "vatPercent" INTEGER NOT NULL DEFAULT 20,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "creditsGranted" INTEGER NOT NULL DEFAULT 0,
  "isPremiumGranted" BOOLEAN NOT NULL DEFAULT FALSE,
  "status" TEXT NOT NULL DEFAULT 'PAID',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Purchase_userId_idx" ON "Purchase"("userId");
CREATE INDEX "Purchase_kind_status_idx" ON "Purchase"("kind","status");
