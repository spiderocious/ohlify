import {
  ADMIN_EP,
  type AdminTransactionDetail,
  type AdminTransactionListItem,
} from '@ohlify/api';

import { useAdminQuery } from '../../../shared/api/use-admin-query.js';
import { useCursorList } from '../../../shared/api/use-cursor-list.js';

type TransactionsFilters = {
  source?: string;
  user_id?: string;
  status?: string;
  reference?: string;
  [k: string]: string | undefined;
};

export function useTransactions(filters: TransactionsFilters) {
  return useCursorList<AdminTransactionListItem>({
    key: ['admin', 'transactions'],
    url: ADMIN_EP.TRANSACTIONS,
    filters,
  });
}

export function useTransaction(id: string | null) {
  return useAdminQuery<AdminTransactionDetail>({
    key: ['admin', 'transaction', id],
    url: id ? ADMIN_EP.TRANSACTION(id) : '',
    enabled: Boolean(id),
  });
}
