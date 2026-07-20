// Client-facing labels + icons for every wallet journal kind.
//
// This is the SINGLE SOURCE for what a transaction row looks like in every
// client (React Native mobile, Flutter mobile, admin/customer web). Both
// clients render the shipped `title` + `icon` directly instead of duplicating
// (and drifting from) this vocabulary locally. See wallet.service.ts →
// listTransactions where these fields get attached to WalletTransactionView.
//
// Adding a new journal kind: extend the union in db enum, add a case here,
// and ship. Not surfacing a kind here silently falls back to the generic
// entry — good-enough default, but every real kind should have its own row.
//
// Icon names are the intersection of what @ohlify/mobile-ui (RN) AND
// mobile/lib/ui/icons/app_icons.dart (Flutter) BOTH register. Do not add
// an icon here without adding it to both icon registries.

export type WalletTxDirection = 'credit' | 'debit';

// Kept in step with the `journal_kind` DB enum (see 0074_journal_kind_minutes
// for the current set). Not literally re-exported from the enum because that
// column lives in migrations, not TS.
export type WalletJournalKind =
  | 'wallet_funding'
  | 'wallet_funding_reversed'
  | 'call_payment_reserve'
  | 'call_settlement'
  | 'call_refund'
  | 'call_refund_post_settle'
  | 'withdrawal_requested'
  | 'withdrawal_completed'
  | 'withdrawal_reversed'
  | 'admin_credit'
  | 'admin_debit'
  | 'admin_manual'
  | 'platform_promo_grant'
  | 'minutes_purchase'
  | 'minutes_settlement';

export interface WalletTxVocabularyEntry {
  /** Short label for the list row. */
  title: string;
  /** Long-form label for receipts / detail sheets. Same as pre-existing description. */
  description: string;
  /** Icon key both clients agree on. See file header. */
  icon: WalletTxIcon;
}

// Icon vocabulary — enumerated so both clients can pattern-match statically
// (a stray icon key on the wire would silently render blank). The names are
// the ohlify-mobile-ui / Flutter app_icons.dart intersection.
export const WALLET_TX_ICONS = [
  'wallet_plus',
  'wallet_minus',
  'phone_outgoing',
  'phone_incoming',
  'phone_refund',
  'bank_arrow_up',
  'bank_arrow_down',
  'admin_shield',
  'gift',
  'clock',
] as const;
export type WalletTxIcon = (typeof WALLET_TX_ICONS)[number];

// The mapping. For kinds whose meaning depends on direction (e.g.
// call_settlement is a debit for the platform, credit for the payee), we
// key off `${kind}:${direction}`. Kinds with a single semantic meaning key
// off just the kind.
const ENTRIES: Record<string, WalletTxVocabularyEntry> = {
  wallet_funding: {
    title: 'Wallet funding',
    description: 'Wallet funding',
    icon: 'wallet_plus',
  },
  wallet_funding_reversed: {
    title: 'Funding reversed',
    description: 'Wallet funding reversed',
    icon: 'wallet_minus',
  },
  call_payment_reserve: {
    title: 'Call booking',
    description: 'Call booking payment',
    icon: 'phone_outgoing',
  },
  // Settlements: the same journal kind fires for both sides of a call. The
  // pro sees a credit (earning) and any counter-party a debit (settlement).
  'call_settlement:credit': {
    title: 'Call earning',
    description: 'Call earning',
    icon: 'phone_incoming',
  },
  'call_settlement:debit': {
    title: 'Call settlement',
    description: 'Call settlement',
    icon: 'phone_outgoing',
  },
  call_refund: {
    title: 'Call refund',
    description: 'Call refund',
    icon: 'phone_refund',
  },
  call_refund_post_settle: {
    title: 'Call refund',
    description: 'Call refund',
    icon: 'phone_refund',
  },
  withdrawal_requested: {
    title: 'Withdrawal',
    description: 'Withdrawal to bank',
    icon: 'bank_arrow_up',
  },
  withdrawal_completed: {
    title: 'Withdrawal completed',
    description: 'Withdrawal completed',
    icon: 'bank_arrow_up',
  },
  withdrawal_reversed: {
    title: 'Withdrawal reversed',
    description: 'Withdrawal reversed',
    icon: 'bank_arrow_down',
  },
  admin_credit: {
    title: 'Manual credit',
    description: 'Manual credit',
    icon: 'admin_shield',
  },
  admin_debit: {
    title: 'Manual debit',
    description: 'Manual debit',
    icon: 'admin_shield',
  },
  admin_manual: {
    title: 'Manual adjustment',
    description: 'Manual adjustment',
    icon: 'admin_shield',
  },
  platform_promo_grant: {
    title: 'Promo credit',
    description: 'Promotional credit',
    icon: 'gift',
  },
  minutes_purchase: {
    title: 'Minutes purchase',
    description: 'Minutes purchase',
    icon: 'clock',
  },
  minutes_settlement: {
    title: 'Minutes usage',
    description: 'Minutes settlement',
    icon: 'clock',
  },
};

// Generic fallback for unknown kinds. Deliberately bland so anything that
// silently falls through is visually flagged as "not-yet-mapped" in QA.
const FALLBACK: WalletTxVocabularyEntry = {
  title: 'Transaction',
  description: 'Transaction',
  icon: 'admin_shield',
};

export const lookupWalletTxVocabulary = (
  kind: string,
  direction: WalletTxDirection,
): WalletTxVocabularyEntry => {
  return ENTRIES[`${kind}:${direction}`] ?? ENTRIES[kind] ?? FALLBACK;
};
