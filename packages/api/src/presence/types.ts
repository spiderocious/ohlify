export interface Presence {
  user_id: string;
  online: boolean;
  accepting_calls: boolean;
  dnd: boolean;
  reachable: boolean;
  last_seen_at: string | null;
}
