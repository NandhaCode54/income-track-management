import type { PaginationOptions, PaginationQuery } from '../types/pagination';
import type { PaginationMeta } from '../types/api-response';

export const parsePagination = (query: PaginationQuery): PaginationOptions => {
  const page = Math.max(1, Number(query.page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(query.perPage) || 20));
  return { page, perPage, skip: (page - 1) * perPage, take: perPage };
};

export const buildMeta = (total: number, page: number, perPage: number): PaginationMeta => {
  const totalPages = Math.ceil(total / perPage);
  return {
    total,
    page,
    perPage,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};
