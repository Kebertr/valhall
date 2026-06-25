-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('VIKING', 'GUD', 'AS');

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "keycloakId" TEXT,
    "name" TEXT NOT NULL,
    "godname" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "status" "MemberStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Member_keycloakId_key" ON "Member"("keycloakId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_godname_key" ON "Member"("godname");
