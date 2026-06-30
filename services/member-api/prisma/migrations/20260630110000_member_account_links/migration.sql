CREATE TABLE "MemberAccountLink" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "memberRecordId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberAccountLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MemberAccountLink_tokenHash_key"
ON "MemberAccountLink"("tokenHash");

CREATE UNIQUE INDEX "MemberAccountLink_memberRecordId_key"
ON "MemberAccountLink"("memberRecordId");

ALTER TABLE "MemberAccountLink"
ADD CONSTRAINT "MemberAccountLink_memberRecordId_fkey"
FOREIGN KEY ("memberRecordId") REFERENCES "Member"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
