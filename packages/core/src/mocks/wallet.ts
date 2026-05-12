import type { Transaction, WalletStats } from '../types/index.js';

export const MOCK_WALLET_BALANCE = '₦560,894,393';

export const MOCK_WALLET_STATS: WalletStats = { thisWeek: 18, thisMonth: 47, totalCalls: 47 };

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-001',
    type: 'withdrawalToBank',
    datetime: 'Feb 2, 2023, 09:56 AM',
    amount: '₦20,000.00',
    status: 'completed',
  },
  {
    id: 'tx-002',
    type: 'paymentAudioCall',
    datetime: 'Feb 2, 2023, 09:56 AM',
    amount: '-₦20,000.00',
    status: 'completed',
  },
  {
    id: 'tx-003',
    type: 'paymentVideoCall',
    datetime: 'Feb 2, 2023, 09:56 AM',
    amount: '-₦20,000.00',
    status: 'completed',
  },
  {
    id: 'tx-004',
    type: 'scheduledAudioCall',
    datetime: 'Feb 2, 2023, 09:56 AM',
    amount: '+₦20,000.00',
    status: 'completed',
  },
];
