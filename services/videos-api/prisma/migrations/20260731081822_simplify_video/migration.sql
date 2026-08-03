-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('UPLOAD_PENDING', 'UPLOADED');

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "status" "VideoStatus" NOT NULL DEFAULT 'UPLOAD_PENDING';
