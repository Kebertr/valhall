ALTER TABLE "Video" RENAME COLUMN "userId" TO "memberId";

DROP INDEX "Video_userId_createdAt_idx";

CREATE INDEX "Video_memberId_createdAt_idx" ON "Video"("memberId", "createdAt");
