export interface Token {
  id: number;
  name: string;
  symbol: string;
  price: number;
  marketCap: number | null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface CreateTokenBody {
  name: string;
  symbol: string;
  price: number;
  marketCap?: number | null;
}

export interface UpdateTokenBody {
  name?: string;
  symbol?: string;
  price?: number;
  marketCap?: number | null;
}

export interface ListTokensQuery {
  search?: string;
  sortBy?: "name" | "symbol" | "price" | "createdAt";
  order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiSuccessResponse<T> {
  data: T;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiListResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: FieldError[];
  };
}
