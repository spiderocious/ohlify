import type { MigrationBuilder } from 'node-pg-migrate';

// Lets an instant call be reviewed.
//
// `reviews.call_id` carried `NOT NULL UNIQUE REFERENCES calls(id)`, so a
// review could only ever point at a *scheduled* call. Instant calls live in
// their own table, and the mobile app posts their `ic_…` id to
// `POST /calls/:id/rating` — which looked it up in `calls`, found nothing, and
// answered "you cannot review this call". Every instant call was unreviewable,
// and the FK meant no amount of service-layer work could have fixed it.
//
// Two nullable FK columns with a CHECK that exactly one is set, rather than one
// loose column holding either id: the referential guarantee is the reason the
// bug was caught at all, and dropping it to save a column would trade a loud
// failure for a silent orphan. Reviews from both kinds stay in ONE table, so
// `review_aggregates`, the professional's rating and admin moderation keep
// working untouched.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`ALTER TABLE reviews ALTER COLUMN call_id DROP NOT NULL`);

  pgm.sql(`
    ALTER TABLE reviews
      ADD COLUMN instant_call_id TEXT REFERENCES instant_calls(id)
  `);

  // The UNIQUE on call_id came with an implicit index that only covers the
  // scheduled side. Drop it for partial indexes so a NULL call_id on an
  // instant-call review does not collide, and each kind still gets its
  // one-review-per-call guarantee.
  pgm.sql(`ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_call_id_key`);

  pgm.sql(`
    CREATE UNIQUE INDEX reviews_call_id_uniq
      ON reviews (call_id) WHERE call_id IS NOT NULL
  `);
  pgm.sql(`
    CREATE UNIQUE INDEX reviews_instant_call_id_uniq
      ON reviews (instant_call_id) WHERE instant_call_id IS NOT NULL
  `);

  // Exactly one. Neither set is a review attached to nothing; both set is a
  // review claiming two different calls, and the aggregates would count it
  // once while the moderation UI showed it twice.
  pgm.sql(`
    ALTER TABLE reviews
      ADD CONSTRAINT reviews_exactly_one_call CHECK (
        (call_id IS NOT NULL) <> (instant_call_id IS NOT NULL)
      )
  `);

  pgm.sql(`
    CREATE INDEX reviews_instant_call_idx
      ON reviews (instant_call_id) WHERE instant_call_id IS NOT NULL
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  // Reviews of instant calls cannot survive the rollback — there is no column
  // left to hold them. Deleted rather than left to fail the NOT NULL, so the
  // reversal is deterministic instead of erroring halfway.
  pgm.sql(`DELETE FROM reviews WHERE instant_call_id IS NOT NULL`);

  pgm.sql(`ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_exactly_one_call`);
  pgm.sql(`DROP INDEX IF EXISTS reviews_instant_call_idx`);
  pgm.sql(`DROP INDEX IF EXISTS reviews_instant_call_id_uniq`);
  pgm.sql(`DROP INDEX IF EXISTS reviews_call_id_uniq`);
  pgm.sql(`ALTER TABLE reviews DROP COLUMN IF EXISTS instant_call_id`);
  pgm.sql(`ALTER TABLE reviews ADD CONSTRAINT reviews_call_id_key UNIQUE (call_id)`);
  pgm.sql(`ALTER TABLE reviews ALTER COLUMN call_id SET NOT NULL`);
};
