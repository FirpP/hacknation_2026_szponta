import type { ScrapeRun } from "../../../../prisma/generated/client";
import type { RunsQuery, ScrapeRunDto } from "@api/runs/validators/runs.validator";

export interface IRunsRepository {
  findRuns(query: RunsQuery): Promise<ScrapeRun[]>;
}

export interface IRunsService {
  listRuns(query: RunsQuery): Promise<ScrapeRunDto[]>;
}
