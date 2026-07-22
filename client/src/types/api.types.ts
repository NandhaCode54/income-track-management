/** Shape every endpoint responds with — see the server's `api-response.util.ts`. */
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export const unwrap = <T>(payload: ApiEnvelope<T>): T => payload.data as T;
