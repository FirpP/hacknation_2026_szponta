import prisma from "@/prisma-client";

type Credentials = { username: string; password: string };

const MIN_PROD_PASSWORD_LENGTH = 12;
const WEAK_PASSWORDS = ["root", "admin", "password", "haslo", "hasło", "123456"];

// Na produkcji nie przyjmujemy haseł z .env.example (root/root) ani zbyt krótkich
const assertStrongPassword = ({ username, password }: Credentials) => {
  const weak =
    password.length < MIN_PROD_PASSWORD_LENGTH ||
    password === username ||
    WEAK_PASSWORDS.includes(password.toLowerCase());
  if (weak) {
    throw new Error(
      `Za słabe SEED_EMPLOYEE_PASSWORD na produkcji: min. ${MIN_PROD_PASSWORD_LENGTH} znaków, inne niż login i niż domyślne hasła.`,
    );
  }
};

// upsert zamiast deleteMany, żeby ponowne uruchomienie nie wylogowywało ani nie kasowało konta pracownika.
// fallback - dane używane, gdy w .env brakuje SEED_EMPLOYEE_* (seed developerski podaje admin/admin).
// Zwraca false, gdy nie ma ani zmiennych, ani fallbacku.
export const seedEmployee = async (fallback?: Credentials): Promise<boolean> => {
  const fromEnv =
    process.env.SEED_EMPLOYEE_USERNAME && process.env.SEED_EMPLOYEE_PASSWORD
      ? { username: process.env.SEED_EMPLOYEE_USERNAME, password: process.env.SEED_EMPLOYEE_PASSWORD }
      : undefined;
  const credentials = fromEnv ?? fallback;

  if (!credentials) {
    console.warn("Skipping employee seeding: set SEED_EMPLOYEE_USERNAME and SEED_EMPLOYEE_PASSWORD in .env.");
    return false;
  }
  if (process.env.NODE_ENV === "production") {
    assertStrongPassword(credentials);
  }

  console.log(`Seeding employee "${credentials.username}"...`);
  const passwordHash = await Bun.password.hash(credentials.password);
  await prisma.employee.upsert({
    where: { username: credentials.username },
    update: { passwordHash },
    create: { username: credentials.username, passwordHash },
  });
  return true;
};

// Osobne uruchomienie (np. na produkcji, gdzie nie chcemy danych przykładowych): bun prisma/seed/seed-employee.ts
if (import.meta.main) {
  seedEmployee()
    .then((created) => {
      console.log(created ? "Employee ready." : "Nothing to do.");
      process.exit(created ? 0 : 1);
    })
    .catch((error) => {
      console.error("Error seeding employee:", error);
      process.exit(1);
    });
}
