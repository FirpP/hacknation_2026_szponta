import prisma from "@/prisma-client";
import type { County, ICountiesRepository } from "@api/counties/types/counties.types";

// SQLite sortuje bajtowo (polskie litery i wielkie litery lądują na końcu/początku), więc sortujemy w aplikacji
const collator = new Intl.Collator("pl", { sensitivity: "base" });

export class CountiesRepository implements ICountiesRepository {
  async getVoivodeships(): Promise<string[]> {
    const rows = await prisma.county.findMany({ distinct: ["voivodeship"], select: { voivodeship: true } });
    return rows.map((row) => row.voivodeship).sort(collator.compare);
  }

  async getByVoivodeship(voivodeship: string): Promise<County[]> {
    const counties = await prisma.county.findMany({ where: { voivodeship }, select: { id: true, name: true } });
    return counties.sort((a, b) => collator.compare(a.name, b.name));
  }
}
