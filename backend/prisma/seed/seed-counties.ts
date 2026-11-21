import prisma from "@/prisma-client";
import { countyData } from "../data/county-data.js";
import { voivodeshipData } from "../data/voivodeship-data.js";

// upsert po (name, voivodeship), żeby ponowne uruchomienie nie duplikowało rekordów
// ani nie zmieniało id powiatów, do których odwołują się już inicjatywy.
export const seedCounties = async (): Promise<number> => {
  console.log("Seeding counties...");
  const operations = voivodeshipData.flatMap((voivodeship) =>
    countyData[voivodeship].map((name) =>
      prisma.county.upsert({
        where: { name_voivodeship: { name, voivodeship } },
        update: {},
        create: { name, voivodeship },
      }),
    ),
  );
  await prisma.$transaction(operations);
  return operations.length;
};

// Osobne uruchomienie (np. na produkcji, gdzie seed developerski jest zablokowany): bun prisma/seed/seed-counties.ts
if (import.meta.main) {
  seedCounties()
    .then((count) => {
      console.log(`Counties ready (${count}).`);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error seeding counties:", error);
      process.exit(1);
    });
}
