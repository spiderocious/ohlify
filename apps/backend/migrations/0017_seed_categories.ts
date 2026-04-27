import type { MigrationBuilder } from 'node-pg-migrate';

export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    INSERT INTO professional_categories (value, label, sort_order, is_active) VALUES
      ('lawyer',          'Lawyer',           10,  TRUE),
      ('doctor',          'Doctor',           20,  TRUE),
      ('therapist',       'Therapist',        30,  TRUE),
      ('coach',           'Coach',            40,  TRUE),
      ('financial_advisor','Financial Advisor',50, TRUE),
      ('architect',       'Architect',        60,  TRUE),
      ('engineer',        'Engineer',         70,  TRUE),
      ('designer',        'Designer',         80,  TRUE),
      ('podcaster',       'Podcaster',        90,  TRUE),
      ('content_creator', 'Content Creator',  100, TRUE),
      ('marketer',        'Marketer',         110, TRUE),
      ('consultant',      'Consultant',       120, TRUE),
      ('teacher',         'Teacher',          130, TRUE),
      ('writer',          'Writer',           140, TRUE),
      ('musician',        'Musician',         150, TRUE),
      ('photographer',    'Photographer',     160, TRUE),
      ('developer',       'Software Engineer',170, TRUE),
      ('other',           'Other',            999, TRUE)
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DELETE FROM professional_categories WHERE value IN (
    'lawyer','doctor','therapist','coach','financial_advisor','architect','engineer',
    'designer','podcaster','content_creator','marketer','consultant','teacher',
    'writer','musician','photographer','developer','other'
  )`);
};
