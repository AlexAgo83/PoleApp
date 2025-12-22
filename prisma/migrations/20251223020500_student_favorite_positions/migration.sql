-- CreateTable
CREATE TABLE "StudentFavoritePosition" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,

    CONSTRAINT "StudentFavoritePosition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentFavoritePosition_studentId_positionId_key" ON "StudentFavoritePosition"("studentId", "positionId");

-- CreateIndex
CREATE INDEX "StudentFavoritePosition_studentId_idx" ON "StudentFavoritePosition"("studentId");

-- CreateIndex
CREATE INDEX "StudentFavoritePosition_positionId_idx" ON "StudentFavoritePosition"("positionId");

-- AddForeignKey
ALTER TABLE "StudentFavoritePosition" ADD CONSTRAINT "StudentFavoritePosition_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFavoritePosition" ADD CONSTRAINT "StudentFavoritePosition_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
