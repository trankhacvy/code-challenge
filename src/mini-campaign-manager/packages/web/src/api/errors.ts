import { AxiosError } from "axios";
import type { ApiError } from "./types";

export function extractApiError(err: unknown, fallback = "Something went wrong"): string {
  const axiosErr = err as AxiosError<ApiError>;
  return axiosErr.response?.data?.error?.message || fallback;
}
