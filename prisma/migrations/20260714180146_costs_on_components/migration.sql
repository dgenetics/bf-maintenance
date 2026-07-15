/*
  Warnings:

  - You are about to drop the column `purchaseCost` on the `System` table. All the data in the column will be lost.
  - You are about to drop the column `purchaseDate` on the `System` table. All the data in the column will be lost.
  - You are about to drop the column `replacementCost` on the `System` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Component" ADD COLUMN "purchaseCost" REAL;
ALTER TABLE "Component" ADD COLUMN "replacementCost" REAL;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_System" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Other',
    "location" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_System" ("category", "createdAt", "id", "location", "name", "notes", "updatedAt") SELECT "category", "createdAt", "id", "location", "name", "notes", "updatedAt" FROM "System";
DROP TABLE "System";
ALTER TABLE "new_System" RENAME TO "System";
CREATE INDEX "System_category_idx" ON "System"("category");
CREATE INDEX "System_name_idx" ON "System"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
