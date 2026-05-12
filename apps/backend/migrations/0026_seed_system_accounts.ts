import type { MigrationBuilder } from 'node-pg-migrate';

// Seed the platform's system accounts. These are singletons — every flow that
// references them resolves the row by system_code via @lib/wallet/accounts.
// IDs are deterministic (acct_sys_<code>) so debugging / log inspection is
// straightforward.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    INSERT INTO accounts (id, kind, owner_user_id, system_code, currency, label, is_active) VALUES
      ('acct_sys_paystack_clearing',  'system',    NULL, 'paystack_clearing',
        'NGN', 'Paystack incoming-funds clearing account',  TRUE),
      ('acct_sys_paystack_fees',      'liability', NULL, 'paystack_fees',
        'NGN', 'Paystack fee tracking account',            TRUE),
      ('acct_sys_paystack_payouts',   'liability', NULL, 'paystack_payouts',
        'NGN', 'Paystack outgoing-transfer pending account', TRUE),
      ('acct_sys_platform_revenue',   'system',    NULL, 'platform_revenue',
        'NGN', 'Platform earned-fee account',              TRUE),
      ('acct_sys_platform_promo',     'system',    NULL, 'platform_promo',
        'NGN', 'Promotional credits issued account',       TRUE),
      ('acct_sys_suspense',           'system',    NULL, 'suspense',
        'NGN', 'Suspense account for unallocated funds',   TRUE),
      ('acct_sys_pending_debits_pool','system',    NULL, 'pending_debits_pool',
        'NGN', 'Reserved-pending debits across users',     TRUE)
    ON CONFLICT DO NOTHING
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DELETE FROM accounts WHERE id LIKE 'acct_sys_%'`);
};
