import type { ContentfulStatusCode } from "hono/utils/http-status";

export type ValidationIssue = {
  field: string;
  message: string;
};

// Minimalny kształt issue wspólny dla Standard Schema i ZodError.issues
type RawIssue = {
  message: string;
  path?: ReadonlyArray<PropertyKey | { key: PropertyKey }>;
};

export class AppError extends Error {
  constructor(
    public override readonly message: string,
    public readonly statusCode: ContentfulStatusCode,
    public readonly code: string,
    // Opcjonalna lista problemów per pole, trafia do error.details w odpowiedzi
    public readonly details?: ValidationIssue[],
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, "NOT_FOUND");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Brak autoryzacji.") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class TooManyRequestsError extends AppError {
  constructor(
    message: string,
    public readonly retryAfterSeconds: number,
  ) {
    super(message, 429, "TOO_MANY_REQUESTS");
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: ValidationIssue[]) {
    super(message, 409, "CONFLICT", details);
  }
}

export class ValidationError extends AppError {
  declare readonly details: ValidationIssue[];

  constructor(message: string, details: ValidationIssue[]) {
    super(message, 422, "VALIDATION_ERROR", details);
  }

  // Jedyne miejsce konwersji issues z biblioteki walidacyjnej na kontrakt API
  static fromIssues(issues: readonly RawIssue[], message = "Przesłane dane są niepoprawne.") {
    return new ValidationError(
      message,
      issues.map((issue) => ({
        field: (issue.path ?? [])
          .map((segment) => String(typeof segment === "object" ? segment.key : segment))
          .join("."),
        message: issue.message,
      })),
    );
  }
}

export class PathNotFoundError extends AppError {
  constructor(message = "Nie ma trasy dla podanego URL.") {
    super(message, 404, "PATH_NOT_FOUND");
  }
}
