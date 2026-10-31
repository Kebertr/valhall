-- CreateTable
CREATE TABLE "Penalty" (
    "id" TEXT NOT NULL,
    "fromName" TEXT NOT NULL,
    "toName" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Penalty_pkey" PRIMARY KEY ("id")
);
