// Public config response is just a key→value map. Mobile and web clients
// fetch this once at cold start, before auth restore — so it's unauthed.
export interface PublicConfigResponse {
  values: Record<string, unknown>;
  fetched_at: string;
}
