import type { County, ICountiesRepository, ICountiesService } from "@api/counties/types/counties.types";

export class CountiesService implements ICountiesService {
  constructor(private readonly countiesRepo: ICountiesRepository) {}

  async getVoivodeships(): Promise<string[]> {
    return this.countiesRepo.getVoivodeships();
  }

  async getCounties(voivodeship: string): Promise<County[]> {
    return this.countiesRepo.getByVoivodeship(voivodeship);
  }
}
