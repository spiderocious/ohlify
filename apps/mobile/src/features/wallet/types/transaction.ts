/** Mirrors mobile/lib/shared/types/transaction.dart. */
export type TransactionType = 'withdrawalToBank' | 'paymentAudioCall' | 'paymentVideoCall' | 'scheduledAudioCall';
export type TransactionStatus = 'completed' | 'pending' | 'failed';

export interface Transaction {
  id: string;
  type: TransactionType;
  datetime: string;
  /** Raw signed amount string e.g. "₦20,000.00", "-₦20,000.00", "+₦20,000.00". */
  amount: string;
  status: TransactionStatus;
}

const TITLES: Record<TransactionType, string> = {
  withdrawalToBank: 'Withdrawal to bank',
  paymentAudioCall: 'Payment for audio call',
  paymentVideoCall: 'Payment for video call',
  scheduledAudioCall: 'Scheduled audio call',
};

export function transactionTitle(t: Transaction): string {
  return TITLES[t.type];
}

export function transactionIsCredit(t: Transaction): boolean {
  return t.amount.startsWith('+');
}

export function transactionIsDebit(t: Transaction): boolean {
  return t.amount.startsWith('-');
}
