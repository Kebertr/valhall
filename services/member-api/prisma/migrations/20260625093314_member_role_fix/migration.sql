/*
  Warnings:

  - You are about to drop the column `roll` on the `Member` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Member" DROP COLUMN "roll",
ADD COLUMN     "role" TEXT;
