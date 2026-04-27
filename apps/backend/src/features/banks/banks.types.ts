export interface BankRow {
  code: string;
  name: string;
  logo_url: string | null;
  is_active: boolean;
  synced_at: Date;
}

export interface BankView {
  code: string;
  name: string;
  logo_url: string | null;
}

export interface ResolveAccountView {
  account_name: string;
}
