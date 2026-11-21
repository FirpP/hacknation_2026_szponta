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

// Komunikat błędu konkretnego pola z error.details (422 walidacja, 409 duplikat)
export const fieldError = (error: unknown, field: string): string | undefined =>
  isApiError(error) ? error.details.find((d) => d.field === field)?.message : undefined;

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

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const headers = new Headers(init.headers);
  // FormData (upload plików) ustawia własny Content-Type z boundary - nie nadpisujemy go
  if (init.body !== undefined && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    credentials: "include", // sesja/cookie z modułu auth
  });
  if (!res.ok) throw await toApiError(res);
  return res.status === 204 ? (undefined as T) : res.json();
};

// Obiekty serializujemy do JSON-a, FormData wysyłamy bez zmian
const toBody = (body: unknown): BodyInit | undefined =>
  body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body);

export const api = {
  get: <T>(p: string, signal?: AbortSignal) => request<T>(p, { signal }),
  post: <T>(p: string, body?: unknown) => request<T>(p, { method: "POST", body: toBody(body) }),
  put: <T>(p: string, body?: unknown) => request<T>(p, { method: "PUT", body: toBody(body) }),
  patch: <T>(p: string, body?: unknown) => request<T>(p, { method: "PATCH", body: toBody(body) }),
  delete: <T>(p: string) => request<T>(p, { method: "DELETE" }),
};
