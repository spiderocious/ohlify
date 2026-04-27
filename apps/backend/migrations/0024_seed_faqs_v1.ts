import type { MigrationBuilder } from 'node-pg-migrate';

// Initial FAQ set. Admin will edit/extend via the §21 admin slice. Plain-text
// answers are sufficient for v1; long-form ones can be migrated to ContentBlock
// arrays later without API changes.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    INSERT INTO faqs (id, question, answer, sort_order, is_published) VALUES
      ('faq_01', 'How do I get paid?',
        'Earnings from completed calls land in your wallet. Add a verified bank account, then withdraw to that bank from the wallet screen.',
        10, TRUE),
      ('faq_02', 'When does a call become billable?',
        'Calls are reserved at booking. Money moves from your wallet to the professional when the call completes.',
        20, TRUE),
      ('faq_03', 'How do I cancel a call?',
        'Open the call from the calls list and tap Cancel. Cancellations are free up to 10 minutes before the scheduled time; after that, the cancellation policy applies.',
        30, TRUE),
      ('faq_04', 'How do I top up my wallet?',
        'Tap Fund Wallet on the wallet screen, choose an amount, and pay via Paystack.',
        40, TRUE),
      ('faq_05', 'Why is my withdrawal pending?',
        'Withdrawals can take up to a few business days depending on your bank. You can track status under wallet → transactions.',
        50, TRUE),
      ('faq_06', 'How do I change my username (handle)?',
        'Go to Settings → Profile and tap your handle. You can rename once every 30 days; old links keep working for 90 days.',
        60, TRUE),
      ('faq_07', 'I think there is a problem with my balance.',
        'Send us a ticket via Help → Contact and include the time and amount. Our team reconciles wallet activity daily.',
        70, TRUE),
      ('faq_08', 'How do I delete my account?',
        'Go to Settings → Account → Delete account. Your data is anonymized immediately and fully purged after 30 days.',
        80, TRUE)
    ON CONFLICT (id) DO NOTHING
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DELETE FROM faqs WHERE id LIKE 'faq_%'`);
};
