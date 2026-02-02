/*
  Warnings:

  - You are about to drop the column `actualDeadline` on the `matters` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedDeadline` on the `matters` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "matters_estimatedDeadline_idx";

-- AlterTable
ALTER TABLE "matters" DROP COLUMN "actualDeadline",
DROP COLUMN "estimatedDeadline",
ADD COLUMN     "deadline" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "statusGroups" ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "matters_deadline_idx" ON "matters"("deadline");
