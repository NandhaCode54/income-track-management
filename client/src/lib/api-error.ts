import { AxiosError } from 'axios';

interface ApiErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
}

/** Extracts a human-readable message from an unknown error (usually an AxiosError). */
export const getApiErrorMessage = (error: unknown, fallback = 'Something went wrong'): string => {
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiErrorBody | undefined;
    if (body?.message) return body.message;
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
};

/** Extracts field-level validation errors, if the API returned any. */
export const getApiFieldErrors = (error: unknown): Record<string, string[]> | undefined => {
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiErrorBody | undefined;
    return body?.errors;
  }
  return undefined;
};
