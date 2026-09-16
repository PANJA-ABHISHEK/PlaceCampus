// ============================================
// API Response Types
// ============================================

/**
 * Standard successful API response wrapper.
 * All API endpoints must return data in this shape.
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

/**
 * Standard API error response.
 * All error responses must use this shape.
 */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

/**
 * Union type for any API response.
 */
export type ApiResult<T> = ApiResponse<T> | ApiError;

/**
 * Paginated response wrapper for list endpoints.
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

/**
 * Pagination metadata included in paginated responses.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Standard pagination query parameters.
 */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

/**
 * Sort direction enum for query building.
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}
