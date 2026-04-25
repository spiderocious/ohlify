import type { MigrationBuilder } from 'node-pg-migrate';

// Top Nigerian banks (codes from Paystack). Real /banks/sync against Paystack
// will land with the banks feature; this seed unblocks PUT /me/bank-account
// for QA + early integration.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    INSERT INTO banks (code, name, is_active) VALUES
      ('044', 'Access Bank',           TRUE),
      ('063', 'Access Bank (Diamond)', TRUE),
      ('035', 'Wema Bank',             TRUE),
      ('050', 'Ecobank Nigeria',       TRUE),
      ('070', 'Fidelity Bank',         TRUE),
      ('011', 'First Bank of Nigeria', TRUE),
      ('214', 'First City Monument Bank', TRUE),
      ('058', 'Guaranty Trust Bank',   TRUE),
      ('030', 'Heritage Bank',         TRUE),
      ('082', 'Keystone Bank',         TRUE),
      ('076', 'Polaris Bank',          TRUE),
      ('221', 'Stanbic IBTC Bank',     TRUE),
      ('068', 'Standard Chartered Bank', TRUE),
      ('232', 'Sterling Bank',         TRUE),
      ('100', 'Suntrust Bank',         TRUE),
      ('032', 'Union Bank of Nigeria', TRUE),
      ('033', 'United Bank for Africa',TRUE),
      ('215', 'Unity Bank',            TRUE),
      ('057', 'Zenith Bank',           TRUE),
      ('50211','Kuda Bank',            TRUE),
      ('999992','OPay',                TRUE),
      ('50515','Moniepoint MFB',       TRUE),
      ('999991','PalmPay',             TRUE),
      ('51310','Sparkle Microfinance Bank', TRUE),
      ('50746','Carbon',               TRUE),
      ('301', 'Jaiz Bank',             TRUE),
      ('51251','Rubies MFB',           TRUE),
      ('327', 'Providus Bank',         TRUE)
    ON CONFLICT (code) DO NOTHING
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    DELETE FROM banks WHERE code IN (
      '044','063','035','050','070','011','214','058','030','082','076',
      '221','068','232','100','032','033','215','057','50211','999992',
      '50515','999991','51310','50746','301','51251','327'
    )
  `);
};
