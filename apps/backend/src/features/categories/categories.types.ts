export interface CategoryRow {
  value: string;
  label: string;
  icon_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface CategoryView {
  value: string;
  label: string;
  icon_url: string | null;
}
