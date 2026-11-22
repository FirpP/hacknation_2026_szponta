import { describe, expect, it, mock } from "bun:test";
import { StatsService } from "@api/stats/services/stats.service";
import type { CardStatsRow, IStatsRepository } from "@api/stats/types/stats.types";

const row = (over: Partial<CardStatsRow> & { source?: string } = {}): CardStatsRow => ({
  domain: "TECHNOLOGICAL",
  implementationStatus: "PROTOTYPE",
  isInnovation: true,
  sourceName: "NCBR",
  evidence: [
    { field: "title", quote: "a", verified: true },
    { field: "trl", quote: "b", verified: false },
  ],
  rawRecord: { source: over.source ?? "ncbr" },
  ...over,
});

const repository = (rows: CardStatsRow[], lastFetchedAt: Date | null): IStatsRepository => ({
  findStatsRows: mock(async () => ({ rows, lastFetchedAt })),
});

describe("StatsService.getStats", () => {
  it("liczy karty wg obszaru, statusu, źródła i odsetek zweryfikowanych cytatów", async () => {
    const service = new StatsService(
      repository(
        [
          row(),
          row({ domain: "EDUCATIONAL", implementationStatus: "IN_USE", isInnovation: false }),
          row({ source: "baztol", sourceName: "BazTOL", isInnovation: null, evidence: null }),
        ],
        new Date("2026-11-22T03:00:00.000Z"),
      ),
    );

    const stats = await service.getStats();

    expect(stats.totalCards).toBe(3);
    expect(stats.innovations).toBe(1);
    expect(stats.byDomain).toEqual({ TECHNOLOGICAL: 2, EDUCATIONAL: 1, ADMINISTRATIVE: 0, OTHER: 0 });
    expect(stats.byStatus.PROTOTYPE).toBe(2);
    expect(stats.byStatus.IN_USE).toBe(1);
    expect(stats.byStatus.UNKNOWN).toBe(0);
    expect(stats.sources).toEqual([
      { id: "ncbr", name: "NCBR", cards: 2 },
      { id: "baztol", name: "BazTOL", cards: 1 },
    ]);
    expect(stats.evidence).toEqual({ total: 4, verified: 2 });
    expect(stats.lastFetchedAt).toBe("2026-11-22T03:00:00.000Z");
  });

  it("pusta baza", async () => {
    const stats = await new StatsService(repository([], null)).getStats();
    expect(stats.totalCards).toBe(0);
    expect(stats.sources).toEqual([]);
    expect(stats.lastFetchedAt).toBeNull();
  });
});
