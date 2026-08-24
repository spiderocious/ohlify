import type { MigrationBuilder } from 'node-pg-migrate';

/**
 * Rollout flag for the redesigned (Hawk) client KYC screen.
 *
 * Unlike the `enablement.*` kill switches — which default TRUE so an untouched
 * environment behaves exactly as before — this defaults **FALSE**. It gates a
 * screen that does not exist yet in any shipped binary, so ON would be a lie in
 * every environment until the client that renders it is released.
 *
 * Public because the mobile app reads it from `GET /platform-config/public` on
 * cold start, before auth restore, to pick which KYC screen to route to.
 *
 * Nothing on the server branches on this key: v2 reuses the same
 * `GET /onboarding/kyc/spec` contract and the same PATCH routes as v1. It is
 * purely a client-side rendering switch, which is what keeps v1 provably
 * untouched while v2 is built.
 */
export const up = (pgm: MigrationBuilder): void => {
  pgm.sql(`
    INSERT INTO platform_config (key, value, is_public) VALUES
      ('features.kyc_v2', 'false'::jsonb, TRUE)
    ON CONFLICT (key) DO NOTHING
  `);
};

export const down = (pgm: MigrationBuilder): void => {
  pgm.sql(`DELETE FROM platform_config WHERE key = 'features.kyc_v2'`);
};
