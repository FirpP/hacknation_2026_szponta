import type { components } from "@/lib/api-types";

// Kształt zgodny z backend/src/lib/errors/error-response.schema.ts (typ generowany ze speca)
type ErrorBody = Partial<components["schemas"]["ErrorResponse"]>;
type ErrorDetail = { field: string; message: string };

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: ErrorDetail[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const isApiError = (error: unknown, status?: number): error is ApiError =>
  error instanceof ApiError && (status === undefined || error.status === status);

const toApiError = async (res: Response): Promise<ApiError> => {
  // Odpowiedź może nie być JSON-em (np. 502 z proxy) – wtedy fallback na status
  const body: ErrorBody | null = await res.json().catch(() => null);
  const err = body?.error;
  return new ApiError(
    res.status,
    err?.code ?? "UNKNOWN_ERROR",
    // || a nie ??, bo przy HTTP/2 statusText to pusty string, a nie null
    err?.message || res.statusText || "Wystąpił nieznany błąd",
    err?.details,
  );
};

const BASE = "/api/v1";

// API Radaru jest tylko do odczytu, więc klient ma wyłącznie GET
const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) throw await toApiError(res);
  return res.json();
};

export const api = {
  get: <T>(p: string, signal?: AbortSignal) => request<T>(p, { signal }),
};
