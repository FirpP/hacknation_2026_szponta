import type { IRunsRepository, IRunsService } from "@api/runs/types/runs.types";
import type { RunsQuery, ScrapeRunDto } from "@api/runs/validators/runs.validator";

export class RunsService implements IRunsService {
  constructor(private readonly repository: IRunsRepository) {}

  async listRuns(query: RunsQuery): Promise<ScrapeRunDto[]> {
    const runs = await this.repository.findRuns(query);
    return runs.map((r) => ({
      id: r.id,
      source: r.source,
      status: r.status,
      startedAt: r.startedAt.toISOString(),
      finishedAt: r.finishedAt?.toISOString() ?? null,
      itemsFetched: r.itemsFetched,
      itemsNew: r.itemsNew,
      itemsChanged: r.itemsChanged,
      error: r.error,
    }));
  }
}
