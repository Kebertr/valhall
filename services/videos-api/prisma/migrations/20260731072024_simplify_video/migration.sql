/*
  Warnings:

  - You are about to drop the column `actualSizeBytes` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `declaredContentType` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `declaredSizeBytes` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `detectedContentType` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `durationSeconds` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `height` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `outputSizeBytes` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `processedAt` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `readyObjectKey` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `rejectionReason` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `sourceObjectKey` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `uploadedAt` on the `Video` table. All the data in the column will be lost.
  - You are about to drop the column `width` on the `Video` table. All the data in the column will be lost.
  - Added the required column `contentType` to the `Video` table without a default value. This is not possible if the table is not empty.
  - Added the required column `objectKey` to the `Video` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sizeBytes` to the `Video` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Video_bucket_readyObjectKey_key";

-- DropIndex
DROP INDEX "Video_bucket_sourceObjectKey_key";

-- DropIndex
DROP INDEX "Video_memberId_createdAt_idx";

-- DropIndex
DROP INDEX "Video_status_createdAt_idx";

-- AlterTable
ALTER TABLE "Video" DROP COLUMN "actualSizeBytes",
DROP COLUMN "declaredContentType",
DROP COLUMN "declaredSizeBytes",
DROP COLUMN "detectedContentType",
DROP COLUMN "durationSeconds",
DROP COLUMN "height",
DROP COLUMN "outputSizeBytes",
DROP COLUMN "processedAt",
DROP COLUMN "readyObjectKey",
DROP COLUMN "rejectionReason",
DROP COLUMN "sourceObjectKey",
DROP COLUMN "status",
DROP COLUMN "uploadedAt",
DROP COLUMN "width",
ADD COLUMN     "contentType" TEXT NOT NULL,
ADD COLUMN     "objectKey" TEXT NOT NULL,
ADD COLUMN     "sizeBytes" BIGINT NOT NULL;

-- DropEnum
DROP TYPE "VideoStatus";

-- CreateIndex
CREATE INDEX "Video_memberId_idx" ON "Video"("memberId");
