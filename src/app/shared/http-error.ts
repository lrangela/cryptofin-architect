import { HttpErrorResponse } from '@angular/common/http';

export function extractApiErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (
    error instanceof HttpErrorResponse &&
    error.error &&
    typeof error.error === 'object' &&
    'message' in error.error &&
    typeof error.error.message === 'string'
  ) {
    return error.error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
