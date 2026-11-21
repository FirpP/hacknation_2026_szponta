import prisma from "@/prisma-client";
import type { RunStatus } from "../../../prisma/generated/client";
import type { RawItem } from "./types";

export const sha256 = (text: string): string => new Bun.CryptoHasher("sha256").update(text).digest("hex");

export const startRun = (source: string) => prisma.scrapeRun.create({ data: { source, status: "RUNNING" } });

export const finishRun = (
  runId: number,
  data: { status: RunStatus; itemsFetched?: number; itemsNew?: number; itemsChanged?: number; error?: string | null },
) => prisma.scrapeRun.update({ where: { id: runId }, data: { ...data, finishedAt: new Date() } });

/** Runy RUNNING bez żywego procesu (np. po kill -9) oznaczamy jako FAILED. Wołane tylko pod lockiem. */
export const failOrphanRuns = () =>
  prisma.scrapeRun.updateMany({
    where: { status: "RUNNING" },
    data: { status: "FAILED", finishedAt: new Date(), error: "Przerwany (proces zakończył się przed zapisem wyniku)" },
  });

export type SaveSummary = { itemsNew: number; itemsChanged: number; itemsUnchanged: number };

/**
 * Idempotentny zapis: upsert po (source, externalId).
 * - nowy rekord => PENDING do analizy
 * - zmieniony contentHash => nowy payload i PENDING (ponowna analiza)
 * - bez zmian => tylko fetchedAt i runId
 */
export const saveItems = async (runId: number, source: string, items: RawItem[]): Promise<SaveSummary> => {
  const summary: SaveSummary = { itemsNew: 0, itemsChanged: 0, itemsUnchanged: 0 };
  const now = new Date();

  for (const item of items) {
    const contentHash = sha256(item.payload);
    const existing = await prisma.rawRecord.findUnique({
      where: { source_externalId: { source, externalId: item.externalId } },
      select: { id: true, contentHash: true },
    });

    if (!existing) {
      await prisma.rawRecord.create({
        data: {
          source,
          externalId: item.externalId,
          url: item.url,
          payloadType: item.payloadType,
          rawPayload: item.payload,
          contentHash,
          fetchedAt: now,
          runId,
        },
      });
      summary.itemsNew++;
    } else if (existing.contentHash !== contentHash) {
      await prisma.rawRecord.update({
        where: { id: existing.id },
        data: {
          url: item.url,
          payloadType: item.payloadType,
          rawPayload: item.payload,
          contentHash,
          fetchedAt: now,
          runId,
          analysisStatus: "PENDING",
          analysisError: null,
          failedHash: null,
        },
      });
      summary.itemsChanged++;
    } else {
      await prisma.rawRecord.update({ where: { id: existing.id }, data: { fetchedAt: now, runId, url: item.url } });
      summary.itemsUnchanged++;
    }
  }
  return summary;
};
