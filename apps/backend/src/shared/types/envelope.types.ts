export interface ApiError {
  code: string;
  message: string;
  field_errors?: Record<string, string[]>;
}

export type ApiEnvelope<T> = { data: T; meta?: Record<string, unknown> } | { error: ApiError };
