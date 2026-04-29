import type { MigrationBuilder } from 'node-pg-migrate';

// Reviews — caller rates the pro after a call completes. One review per call
// (UNIQUE on call_id). Reviews drive `review_aggregates` which `professionals`
// queries already read from (the table existed only as a planning placeholder
// before this migration; the repo had a runtime-detect fallback for it).
//
// is_public defaults TRUE; admin moderation flips to FALSE on hide. The
// recompute trigger ignores hidden reviews when computing aggregates.
//
// Lifecycle: review is created once and never deleted (only hidden). The
// trigger fires on INSERT/UPDATE and recomputes the aggregate row for the
// subject pro. UPDATE-on-hide must therefore also fire the trigger so the
// aggregate drops the hidden review's contribution.
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    CREATE TABLE reviews (
      id                   TEXT PRIMARY KEY,
      call_id              TEXT NOT NULL UNIQUE REFERENCES calls(id),
      reviewer_user_id     TEXT NOT NULL REFERENCES users(id),
      subject_user_id      TEXT NOT NULL REFERENCES users(id),
      rating               SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
      feedback_text        TEXT,
      is_public            BOOLEAN NOT NULL DEFAULT TRUE,
      hidden_at            TIMESTAMPTZ,
      hidden_by_admin_id   TEXT,
      hide_reason          TEXT,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
      CHECK (reviewer_user_id <> subject_user_id)
    )
  `);

  pgm.sql(
    `CREATE INDEX reviews_subject_created_idx ON reviews (subject_user_id, created_at DESC)`,
  );
  pgm.sql(`CREATE INDEX reviews_reviewer_idx ON reviews (reviewer_user_id, created_at DESC)`);
  pgm.sql(`CREATE INDEX reviews_rating_idx ON reviews (rating)`);

  // review_aggregates: per-professional rolling rating + count. professionals
  // repo already reads from this table (with a runtime-detect fallback that
  // we'll remove now that the table is mandatory).
  pgm.sql(`
    CREATE TABLE review_aggregates (
      user_id      TEXT PRIMARY KEY REFERENCES users(id),
      rating       NUMERIC(3, 2) NOT NULL DEFAULT 0,
      review_count INT NOT NULL DEFAULT 0 CHECK (review_count >= 0),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Recompute trigger — runs on INSERT / UPDATE of reviews. Computes the
  // aggregate from scratch for the affected subject(s); upserts into
  // review_aggregates. Only counts reviews with is_public = TRUE.
  //
  // On UPDATE we recompute for OLD.subject_user_id too — handles the edge
  // case of an admin re-attributing a review (shouldn't happen in our flows
  // but defensive). When subject is the same on both sides it's a single
  // recompute.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION reviews_recompute_aggregate() RETURNS trigger AS $$
    DECLARE
      target_user TEXT;
    BEGIN
      -- Pick the subject(s) we need to recompute.
      IF (TG_OP = 'INSERT') THEN
        target_user := NEW.subject_user_id;
      ELSIF (TG_OP = 'UPDATE') THEN
        target_user := NEW.subject_user_id;
        -- If subject changed, recompute the old subject too.
        IF NEW.subject_user_id IS DISTINCT FROM OLD.subject_user_id THEN
          INSERT INTO review_aggregates (user_id, rating, review_count, updated_at)
          SELECT
            OLD.subject_user_id,
            COALESCE(AVG(rating)::NUMERIC(3, 2), 0),
            COUNT(*)::INT,
            now()
          FROM reviews
          WHERE subject_user_id = OLD.subject_user_id
            AND is_public = TRUE
            AND id <> COALESCE(NEW.id, '')
          ON CONFLICT (user_id) DO UPDATE
            SET rating = EXCLUDED.rating,
                review_count = EXCLUDED.review_count,
                updated_at = EXCLUDED.updated_at;
        END IF;
      END IF;

      -- Recompute the (current) subject's aggregate.
      INSERT INTO review_aggregates (user_id, rating, review_count, updated_at)
      SELECT
        target_user,
        COALESCE(AVG(rating)::NUMERIC(3, 2), 0),
        COUNT(*)::INT,
        now()
      FROM reviews
      WHERE subject_user_id = target_user
        AND is_public = TRUE
      ON CONFLICT (user_id) DO UPDATE
        SET rating = EXCLUDED.rating,
            review_count = EXCLUDED.review_count,
            updated_at = EXCLUDED.updated_at;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  pgm.sql(`
    CREATE TRIGGER reviews_aggregate_recompute
      AFTER INSERT OR UPDATE ON reviews
      FOR EACH ROW EXECUTE FUNCTION reviews_recompute_aggregate()
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DROP TRIGGER IF EXISTS reviews_aggregate_recompute ON reviews`);
  pgm.sql(`DROP FUNCTION IF EXISTS reviews_recompute_aggregate()`);
  pgm.sql(`DROP TABLE IF EXISTS review_aggregates`);
  pgm.sql(`DROP TABLE IF EXISTS reviews`);
};