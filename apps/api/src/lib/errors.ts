/**
 * Expected errors carry an HTTP status and a stable code the client can rely on.
 * Anything else that reaches the error handler is treated as an unexpected 500.
 */
export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super(404, 'NOT_FOUND', `${entity} "${id}" לא נמצא`);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, cause?: unknown) {
    super(502, 'EXTERNAL_SERVICE_ERROR', `השירות ${service} אינו זמין כרגע`);
    this.cause = cause;
  }
}
