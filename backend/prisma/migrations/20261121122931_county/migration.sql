-- CreateTable
CREATE TABLE "Initiative" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "institutionId" TEXT NOT NULL,
    "countyId" INTEGER NOT NULL,
    CONSTRAINT "Initiative_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Initiative_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "County" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "County" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "voivodeship" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "Initiative_countyId_idx" ON "Initiative"("countyId");

-- CreateIndex
CREATE INDEX "County_voivodeship_idx" ON "County"("voivodeship");

-- CreateIndex
CREATE UNIQUE INDEX "County_name_voivodeship_key" ON "County"("name", "voivodeship");
