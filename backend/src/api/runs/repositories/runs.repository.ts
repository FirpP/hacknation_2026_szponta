import prisma from "@/prisma-client";
import type { IRunsRepository } from "@api/runs/types/runs.types";
import type { RunsQuery } from "@api/runs/validators/runs.validator";

export class RunsRepository implements IRunsRepository {
  async findRuns(query: RunsQuery) {
    return prisma.scrapeRun.findMany({
      where: query.source ? { source: query.source } : {},
      orderBy: { id: "desc" },
      take: query.limit,
    });
  }
}
