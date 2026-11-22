import { describe, expect, it, mock } from "bun:test";
import { RunsService } from "@api/runs/services/runs.service";
import type { IRunsRepository } from "@api/runs/types/runs.types";
import { RunsQuerySchema } from "@api/runs/validators/runs.validator";

describe("RunsService.listRuns", () => {
  it("mapuje runy na DTO z datami w ISO i przekazuje filtry do repozytorium", async () => {
    const findRuns = mock(async () => [
      {
        id: 7,
        source: "ncbr",
        startedAt: new Date("2026-11-22T03:00:00.000Z"),
        finishedAt: null,
        status: "RUNNING" as const,
        itemsFetched: 10,
        itemsNew: 4,
        itemsChanged: 1,
        error: null,
      },
    ]);
    const repository: IRunsRepository = { findRuns };
    const query = RunsQuerySchema.parse({ source: "ncbr" });

    const runs = await new RunsService(repository).listRuns(query);

    expect(findRuns).toHaveBeenCalledWith({ source: "ncbr", limit: 20 });
    expect(runs).toEqual([
      {
        id: 7,
        source: "ncbr",
        status: "RUNNING",
        startedAt: "2026-11-22T03:00:00.000Z",
        finishedAt: null,
        itemsFetched: 10,
        itemsNew: 4,
        itemsChanged: 1,
        error: null,
      },
    ]);
  });
});
