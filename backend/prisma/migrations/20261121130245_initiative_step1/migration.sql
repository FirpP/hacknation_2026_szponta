/*
  Warnings:

  - Added the required column `contactPersonId` to the `Initiative` table without a default value. This is not possible if the table is not empty.
  - Added the required column `isYouthInitiative` to the `Initiative` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "ContactPerson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Author" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "initiativeId" TEXT NOT NULL,
    CONSTRAINT "Author_initiativeId_fkey" FOREIGN KEY ("initiativeId") REFERENCES "Initiative" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Initiative" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "institutionId" TEXT NOT NULL,
    "countyId" INTEGER NOT NULL,
    "contactPersonId" TEXT NOT NULL,
    "isYouthInitiative" BOOLEAN NOT NULL,
    CONSTRAINT "Initiative_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Initiative_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "County" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Initiative_contactPersonId_fkey" FOREIGN KEY ("contactPersonId") REFERENCES "ContactPerson" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Initiative" ("countyId", "id", "institutionId", "status") SELECT "countyId", "id", "institutionId", "status" FROM "Initiative";
DROP TABLE "Initiative";
ALTER TABLE "new_Initiative" RENAME TO "Initiative";
CREATE INDEX "Initiative_countyId_idx" ON "Initiative"("countyId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
