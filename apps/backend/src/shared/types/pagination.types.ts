export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface PaginationParams {
  page?: number;
  per_page?: number;
}

export const DEFAULT_PAGE = 1;
export const DEFAULT_PER_PAGE = 20;
export const MAX_PER_PAGE = 100;

export const paginate = (
  params: PaginationParams,
): { limit: number; offset: number; page: number; per_page: number } => {
  const page = Math.max(1, params.page ?? DEFAULT_PAGE);
  const per_page = Math.min(MAX_PER_PAGE, Math.max(1, params.per_page ?? DEFAULT_PER_PAGE));
  return { limit: per_page, offset: (page - 1) * per_page, page, per_page };
};

export const buildPaginationMeta = (
  total: number,
  page: number,
  per_page: number,
): PaginationMeta => {
  const total_pages = Math.ceil(total / per_page);
  return {
    page,
    per_page,
    total,
    total_pages,
    has_next: page < total_pages,
    has_prev: page > 1,
  };
};
