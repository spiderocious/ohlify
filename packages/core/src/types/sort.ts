export type SortKey = 'rating' | 'price' | 'name';
export type SortDirection = 'asc' | 'desc';

export interface SortOption {
  key: SortKey;
  direction: SortDirection;
}
