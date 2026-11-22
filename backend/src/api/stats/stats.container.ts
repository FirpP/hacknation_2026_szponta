import { StatsRepository } from "@api/stats/repositories/stats.repository";
import { StatsService } from "@api/stats/services/stats.service";

// Composition root modułu stats. Testy tworzą własny StatsService z mockiem repozytorium.
export const statsService = new StatsService(new StatsRepository());
