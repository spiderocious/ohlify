import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserRow } from '@features/auth/auth.types.js';
import type { RateRow } from '@features/rates/rates.types.js';

import type { KycItemSpec } from './onboarding.types.js';

// The spec builder reaches for four collaborators. Only the rate rows matter
// here, so the rest are stubbed to their empty shapes — a real DB would add
// nothing but setup cost to assertions about pure mapping logic.
vi.mock('@features/rates/rates.repo.js', () => ({
  findActiveByUser: vi.fn(() => Promise.resolve(rateRows)),
}));
vi.mock('@features/profile/profile.repo.js', () => ({
  findBankAccount: vi.fn(() => Promise.resolve(null)),
}));
vi.mock('./onboarding.repo.js', () => ({
  findLatestKycSubmission: vi.fn(() => Promise.resolve(null)),
  findUserById: vi.fn(() => Promise.resolve(null)),
}));

const { buildKycSpec, findIncompleteKeys } = await import('./onboarding.kyc-spec.js');

let rateRows: RateRow[] = [];

const rate = (over: Partial<RateRow> = {}): RateRow => ({
  id: 'rate_a1',
  user_id: 'usr_1',
  call_type: 'audio',
  duration_minutes: 30,
  price_kobo: '500000',
  currency: 'NGN',
  created_at: new Date('2026-01-01T00:00:00Z'),
  deleted_at: null,
  ...over,
});

const professional = (): UserRow => ({
  id: 'usr_1',
  role: 'professional',
  status: 'active',
  email: 'pro@test.test',
  email_verified_at: new Date(),
  phone_number: '+2348000000000',
  phone_verified_at: new Date(),
  password_hash: 'x',
  full_name: 'Ada Pro',
  handle: 'ada',
  handle_changed_at: null,
  avatar_url: null,
  selfie_upload_key: null,
  cover_photo_url: null,
  occupation: 'Doctor',
  description: 'Bio',
  interests: ['health'],
  categories: [],
  is_available: true,
  kyc_status: 'approved',
  kyc_submitted_at: null,
  kyc_reviewed_at: null,
  kyc_reject_reason: null,
  last_seen_at: null,
  suspended_until: null,
  deleted_at: null,
  created_at: new Date(),
  updated_at: new Date(),
});

const itemFor = (items: KycItemSpec[], key: string): KycItemSpec | undefined =>
  items.find((i) => i.key === key);

describe('kyc spec — per-channel rate items', () => {
  beforeEach(() => {
    rateRows = [];
  });

  it('marks audio complete and video incomplete when only audio is priced', async () => {
    rateRows = [rate({ call_type: 'audio' })];

    const spec = await buildKycSpec(professional());
    const audio = itemFor(spec.items, 'audio_rate');
    const video = itemFor(spec.items, 'video_rate');

    expect(audio?.complete).toBe(true);
    expect(video?.complete).toBe(false);
    // Null, not an empty object — the client branches on absence to decide
    // whether the tile reads "not set".
    expect(video?.value).toBeNull();
  });

  it('exposes the floored per-minute price the server derives', async () => {
    // 500000 kobo over 30 min floors to 16666 — not 16666.67.
    rateRows = [rate({ price_kobo: '500000', duration_minutes: 30 })];

    const spec = await buildKycSpec(professional());
    const audio = itemFor(spec.items, 'audio_rate');

    expect(audio?.value).toMatchObject({
      call_type: 'audio',
      duration_minutes: 30,
      price_kobo: 500000,
      price_per_minute_kobo: 16666,
    });
  });

  it('picks the newest row when a channel has more than one active rate', async () => {
    // Possible for data created before single_rate_per_channel was switched on.
    rateRows = [
      rate({ id: 'rate_old', created_at: new Date('2026-01-01T00:00:00Z'), price_kobo: '100000' }),
      rate({ id: 'rate_new', created_at: new Date('2026-06-01T00:00:00Z'), price_kobo: '900000' }),
    ];

    const spec = await buildKycSpec(professional());

    expect(itemFor(spec.items, 'audio_rate')?.value).toMatchObject({
      id: 'rate_new',
      price_kobo: 900000,
    });
  });

  it('does not throw on a legacy zero-duration row', async () => {
    // perMinuteKobo throws on a non-positive duration, and a service must never
    // throw — the spec endpoint has to degrade, not 500.
    rateRows = [rate({ duration_minutes: 0 })];

    const spec = await buildKycSpec(professional());

    expect(itemFor(spec.items, 'audio_rate')?.value).toMatchObject({
      price_per_minute_kobo: 0,
    });
  });

  it('renders both tiles even when nothing is priced', async () => {
    const spec = await buildKycSpec(professional());

    expect(itemFor(spec.items, 'audio_rate')).toBeDefined();
    expect(itemFor(spec.items, 'video_rate')).toBeDefined();
  });
});

describe('kyc spec — the split must not move any professional’s status', () => {
  beforeEach(() => {
    rateRows = [];
  });

  it('keeps an audio-only professional complete', async () => {
    // The regression this whole design exists to avoid: before the split, any
    // single rate satisfied the `rates` item. An audio-only pro must still be
    // complete afterwards, or every one of them gets bounced back into KYC.
    rateRows = [rate({ call_type: 'audio' })];
    const user = professional();

    const spec = await buildKycSpec(user);
    const incomplete = await findIncompleteKeys(user);

    expect(incomplete).not.toContain('audio_rate');
    expect(incomplete).not.toContain('video_rate');
    // video_rate is enabled (the tile renders) but not required (it does not
    // gate). Those two flags being separate is what makes this safe.
    expect(itemFor(spec.items, 'video_rate')?.enabled).toBe(true);
    expect(itemFor(spec.items, 'video_rate')?.required).toBe(false);
  });

  it('reports only audio_rate as missing when no rate exists', async () => {
    const incomplete = await findIncompleteKeys(professional());

    expect(incomplete).toContain('audio_rate');
    expect(incomplete).not.toContain('video_rate');
  });
});
