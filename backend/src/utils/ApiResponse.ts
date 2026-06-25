/**
 * ApiResponse.ts - Standardized API Response Helper
 *
 * Purpose: Ensures all API responses have a consistent structure.
 * This makes the frontend code simpler and more predictable.
 *
 * Response Format:
 * {
 *   success: boolean,
 *   message: string,
 *   data?: T,           // Optional payload
 *   errors?: object[],  // Optional validation errors
 *   pagination?: {      // Optional for list responses
 *     page, limit, total, totalPages
 *   }
 * }
 *
 * Usage:
 *   res.status(200).json(ApiResponse.success('User fetched', user));
 *   res.status(400).json(ApiResponse.error('Validation failed', errors));
 */

/**
 * Pagination metadata included in list responses.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Standard API response structure.
 * Generic type T allows typing the data payload.
 */
export interface ApiResponseBody<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: ValidationError[];
  pagination?: PaginationMeta;
}

/**
 * Validation error structure for field-level errors.
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * ApiResponse helper class.
 * Provides static methods for creating consistent response objects.
 */
export class ApiResponse {
  /**
   * Creates a successful response object.
   *
   * @param message - Human-readable success message
   * @param data - Optional response payload
   * @param pagination - Optional pagination metadata for list responses
   * @returns Formatted success response
   */
  static success<T>(
    message: string,
    data?: T,
    pagination?: PaginationMeta
  ): ApiResponseBody<T> {
    const response: ApiResponseBody<T> = {
      success: true,
      message,
    };

    if (data !== undefined) {
      response.data = data;
    }

    if (pagination) {
      response.pagination = pagination;
    }

    return response;
  }

  /**
   * Creates an error response object.
   *
   * @param message - Human-readable error message
   * @param errors - Optional array of field-level validation errors
   * @returns Formatted error response
   */
  static error(message: string, errors?: ValidationError[]): ApiResponseBody {
    const response: ApiResponseBody = {
      success: false,
      message,
    };

    if (errors && errors.length > 0) {
      response.errors = errors;
    }

    return response;
  }
}
