/*
  Warnings:

  - Made the column `userId` on table `companies` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "companies" ALTER COLUMN "userId" SET NOT NULL;
