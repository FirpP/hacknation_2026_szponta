import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { AppError, ConflictError, NotFoundError } from "@lib/errors/app-errors";

type PrismaErrorMeta = {
  modelName?: string;
  target?: string[] | string;
  driverAdapterError?: { cause?: { constraint?: { fields?: string[] } } };
};

// Pola z naruszonego ograniczenia: klasyczny silnik daje meta.target, driver adapter (bun sqlite) - constraint.fields
const constraintFields = (meta: PrismaErrorMeta | undefined): string[] => {
  const fields = meta?.driverAdapterError?.cause?.constraint?.fields ?? meta?.target ?? [];
  return Array.isArray(fields) ? fields : [fields];
};

/**
 * Zamienia znane błędy Prismy na błędy kontraktu API. Zwraca null dla błędów, których nie mapujemy (-> 500).
 * - P2002 (unikalność, np. duplikat email) -> 409 CONFLICT, pola w details
 * - P2025 (rekord nie istnieje przy update/delete) -> 404 NOT_FOUND
 * - P2003 (klucz obcy) -> 409 CONFLICT
 */
export const mapPrismaError = (err: unknown): AppError | null => {
  if (!(err instanceof PrismaClientKnownRequestError)) return null;
  const meta = err.meta as PrismaErrorMeta | undefined;

  switch (err.code) {
    case "P2002": {
      const fields = constraintFields(meta);
      return new ConflictError(
        fields.length ? `Wartość pola ${fields.join(", ")} jest już zajęta.` : "Rekord o tych danych już istnieje.",
        fields.map((field) => ({ field, message: "Wartość jest już zajęta." })),
      );
    }
    case "P2025":
      return new NotFoundError(
        meta?.modelName ? `Nie znaleziono rekordu (${meta.modelName}).` : "Nie znaleziono rekordu.",
      );
    case "P2003":
      return new ConflictError("Operacja narusza powiązanie z innym rekordem.");
    default:
      return null;
  }
};
