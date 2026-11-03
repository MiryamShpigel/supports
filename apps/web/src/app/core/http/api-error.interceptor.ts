import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import type { ApiErrorBody } from '@supports/shared';
import { catchError, throwError } from 'rxjs';

/** Turns any failed API call into a readable message for the user, in one place. */
export const apiErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const message = toUserMessage(error);
      snackBar.open(message, 'סגירה', { duration: 6000, direction: 'rtl' });
      return throwError(() => new Error(message));
    }),
  );
};

function toUserMessage(error: HttpErrorResponse): string {
  if (error.status === 0) return 'אין חיבור לשרת. יש לוודא שהשרת פועל.';
  const body = error.error as ApiErrorBody | null;
  const details = Array.isArray(body?.error.details)
    ? (body.error.details as { message?: string }[]).map((d) => d.message).filter(Boolean)
    : [];
  const message = body?.error.message ?? 'אירעה שגיאה בלתי צפויה';
  const text = details.length ? `${message}: ${details.join(' · ')}` : message;
  return withSupportId(text, error, body);
}

/**
 * Server-side failures carry the request's correlation id, which is on every log line of that
 * request. Showing its start lets support find the exact failure instead of guessing.
 * Errors the user can fix themselves (validation, not found) do not need it.
 */
function withSupportId(text: string, error: HttpErrorResponse, body: ApiErrorBody | null): string {
  if (error.status < 500) return text;
  const id = body?.error.correlationId ?? error.headers.get('x-correlation-id');
  return id ? `${text} (מזהה לתמיכה: ${id.slice(0, 8)})` : text;
}
