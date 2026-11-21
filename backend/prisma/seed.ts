import prisma from "@/prisma-client";
import { usersData } from "./seed-data.js";
import { seedEmployee } from "./seed-employee.js";

// Seed jest tylko developerski (czyści tabelę users). Na produkcji: bun run prod:employee
if (process.env.NODE_ENV === "production") {
  console.error("prisma db seed czyści tabelę users i nie jest przeznaczony na produkcję. Użyj: bun run prod:employee");
  process.exit(1);
}

// Konto do logowania na świeżym klonie, bez tworzenia .env
const DEV_EMPLOYEE = { username: "admin", password: "admin" };

const seedUsers = async () => {
  console.log("Seeding users...");
  await prisma.user.deleteMany();
  await prisma.user.createMany({
    data: usersData,
  });
};

const main = async () => {
  console.log("Seeding database...");
  await seedUsers();
  await seedEmployee(DEV_EMPLOYEE);
};

main()
  .then(() => {
    console.log("Database seeded successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error seeding database:", error);
    process.exit(1);
  });
