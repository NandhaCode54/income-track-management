export interface PaginationQuery {
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface PaginationOptions {
  page: number;
  perPage: number;
  skip: number;
  take: number;
}
