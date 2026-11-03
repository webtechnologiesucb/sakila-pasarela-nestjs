export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export function success<T>(data: T, message?: string): ApiResponse<T> {
  return { success: true, data, ...(message && { message }) };
}
