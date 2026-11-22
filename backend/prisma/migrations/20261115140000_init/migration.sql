-- CreateTable
CREATE TABLE "ScrapeRun" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "source" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'RUNNING',
    "itemsFetched" INTEGER NOT NULL DEFAULT 0,
    "itemsNew" INTEGER NOT NULL DEFAULT 0,
    "itemsChanged" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT
);

-- CreateTable
CREATE TABLE "RawRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "source" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "payloadType" TEXT NOT NULL,
    "rawPayload" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "firstSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "runId" INTEGER NOT NULL,
    "analysisStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "analysisError" TEXT,
    "analysisAttempts" INTEGER NOT NULL DEFAULT 0,
    "failedHash" TEXT,
    CONSTRAINT "RawRecord_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ScrapeRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InnovationCard" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "rawRecordId" INTEGER NOT NULL,
    "rawContentHash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "applicationArea" TEXT,
    "domain" TEXT NOT NULL,
    "isInnovation" BOOLEAN,
    "isInnovationRationale" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "sourceName" TEXT NOT NULL,
    "implementationStatus" TEXT NOT NULL,
    "trl" INTEGER,
    "innovationScore" INTEGER NOT NULL,
    "innovationRationale" TEXT NOT NULL,
    "applicationPotentialScore" INTEGER NOT NULL,
    "applicationPotentialRationale" TEXT NOT NULL,
    "credibilityScore" INTEGER NOT NULL,
    "credibilityRationale" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "fieldBasis" JSONB NOT NULL,
    "analyzedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    CONSTRAINT "InnovationCard_rawRecordId_fkey" FOREIGN KEY ("rawRecordId") REFERENCES "RawRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ScrapeRun_source_startedAt_idx" ON "ScrapeRun"("source", "startedAt");

-- CreateIndex
CREATE INDEX "RawRecord_analysisStatus_idx" ON "RawRecord"("analysisStatus");

-- CreateIndex
CREATE INDEX "RawRecord_runId_idx" ON "RawRecord"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "RawRecord_source_externalId_key" ON "RawRecord"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "InnovationCard_rawRecordId_key" ON "InnovationCard"("rawRecordId");

-- CreateIndex
CREATE INDEX "InnovationCard_implementationStatus_idx" ON "InnovationCard"("implementationStatus");

-- CreateIndex
CREATE INDEX "InnovationCard_trl_idx" ON "InnovationCard"("trl");

-- CreateIndex
CREATE INDEX "InnovationCard_sourceName_idx" ON "InnovationCard"("sourceName");

-- CreateIndex
CREATE INDEX "InnovationCard_domain_idx" ON "InnovationCard"("domain");

-- CreateIndex
CREATE INDEX "InnovationCard_analyzedAt_idx" ON "InnovationCard"("analyzedAt");

