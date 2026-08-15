-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'REJECTED');

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "VideoStatus" NOT NULL DEFAULT 'PENDING',
    "bucket" TEXT NOT NULL,
    "sourceObjectKey" TEXT NOT NULL,
    "readyObjectKey" TEXT,
    "originalFilename" TEXT NOT NULL,
    "declaredContentType" TEXT NOT NULL,
    "declaredSizeBytes" BIGINT NOT NULL,
    "detectedContentType" TEXT,
    "actualSizeBytes" BIGINT,
    "outputSizeBytes" BIGINT,
    "durationSeconds" DOUBLE PRECISION,
    "width" INTEGER,
    "height" INTEGER,
    "rejectionReason" TEXT,
    "uploadExpiresAt" TIMESTAMP(3) NOT NULL,
    "uploadedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Video_userId_createdAt_idx" ON "Video"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Video_status_createdAt_idx" ON "Video"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Video_bucket_sourceObjectKey_key" ON "Video"("bucket", "sourceObjectKey");

-- CreateIndex
CREATE UNIQUE INDEX "Video_bucket_readyObjectKey_key" ON "Video"("bucket", "readyObjectKey");
