export interface Review {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  /** Display-formatted relative timestamp, e.g. "2 days ago". */
  timeAgo: string;
  /** File-service key for the author avatar. See `Professional.avatarKey`. */
  authorAvatarKey?: string | null;
}
