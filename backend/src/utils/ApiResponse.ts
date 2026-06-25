/**
 * ApiResponse.ts - Standardized HTTP Response Helper
 *
 * Every API response follows the same envelope:
 * {
 *   success: boolean,
 *   message: string,
 *   data?:   T,
 *   errors?: ValidationError[],
 *   pagination?: PaginationMeta
 * }
 *
 * Usage:
 *   res.status(200).json(ApiResponse.success('Fetched', user));
 *   res.status(400).json(ApiResponse.error('Validation failed', errors));
 */

export interface PaginationMeta {
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
}

export interface ValidationError {
  field:   string;
  message: string;
}

export interface ApiResponseBody<T = unknown> {
  success:    boolean;
  message:    string;
  data?:      T;
  errors?:    ValidationError[];
  pagination?: PaginationMeta;
}

export class ApiResponse {
  static success<T>(
    message: string,
    data?: T,
    pagination?: PaginationMeta,
  ): ApiResponseBody<T> {
    const body: ApiResponseBody<T> = { success: true, message };
    if (data !== undefined)  body.data = data;
    if (pagination)          body.pagination = pagination;
    return body;
  }

  static error(message: string, errors?: ValidationError[]): ApiResponseBody {
    const body: ApiResponseBody = { success: false, message };
    if (errors?.length) body.errors = errors;
    return body;
  }
}
