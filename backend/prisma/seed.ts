import { seedEmployee } from "./seed-employee.js";

// Seed jest tylko developerski. Na produkcji: bun run prod:employee
if (process.env.NODE_ENV === "production") {
  console.error("prisma db seed nie jest przeznaczony na produkcję. Użyj: bun run prod:employee");
  process.exit(1);
}

// Konto do logowania na świeżym klonie, bez tworzenia .env
const DEV_EMPLOYEE = { username: "admin", password: "admin" };

const main = async () => {
  console.log("Seeding database...");
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
