export interface Review {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  /** Display-formatted relative timestamp, e.g. "2 days ago". */
  timeAgo: string;
  authorAvatarUrl?: string;
}
