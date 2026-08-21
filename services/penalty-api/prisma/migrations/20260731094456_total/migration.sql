/*
  Warnings:

  - You are about to drop the column `videoUrl` on the `Redemption` table. All the data in the column will be lost.
  - Added the required column `videoId` to the `Redemption` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Redemption" DROP COLUMN "videoUrl",
ADD COLUMN     "videoId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "BongBalance" (
    "memberId" TEXT NOT NULL,
    "totalAdded" INTEGER NOT NULL DEFAULT 0,
    "totalTaken" INTEGER NOT NULL DEFAULT 0,
    "totalPending" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BongBalance_pkey" PRIMARY KEY ("memberId")
);

-- CreateIndex
CREATE INDEX "Redemption_toId_idx" ON "Redemption"("toId");
