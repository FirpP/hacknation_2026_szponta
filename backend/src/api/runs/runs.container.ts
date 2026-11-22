import { RunsRepository } from "@api/runs/repositories/runs.repository";
import { RunsService } from "@api/runs/services/runs.service";

// Composition root modułu runs. Testy tworzą własny RunsService z mockiem repozytorium.
export const runsService = new RunsService(new RunsRepository());
