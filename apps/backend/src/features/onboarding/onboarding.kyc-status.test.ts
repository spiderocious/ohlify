import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserRow } from '@features/auth/auth.types.js';

import type { KycItemSpec, KycSubmissionRow } from './onboarding.types.js';

// Separate file from `onboarding.kyc-spec.test.ts` because these cases need
// `findLatestKycSubmission` to return real rows, and that module mock is fixed
// at import time. Splitting beats rewriting a passing suite to make its mocks
// configurable.
vi.mock('@features/rates/rates.repo.js', () => ({
  findActiveByUser: vi.fn(() => Promise.resolve([])),
}));
vi.mock('@features/profile/profile.repo.js', () => ({
  findBankAccount: vi.fn(() => Promise.resolve(null)),
}));
vi.mock('./onboarding.repo.js', () => ({
  findLatestKycSubmission: vi.fn(() => Promise.resolve(submission)),
  findUserById: vi.fn(() => Promise.resolve(null)),
}));

const { buildKycSpec } = await import('./onboarding.kyc-spec.js');

let submission: KycSubmissionRow | null = null;

const rejectedSubmission = (itemKeys: string[] | null): KycSubmissionRow => ({
  id: 'kyc_1',
  user_id: 'usr_1',
  identity_type: 'nin',
  identity_number: '12345678901',
  document_upload_id: null,
  selfie_upload_key: null,
  status: 'rejected',
  reviewed_by: 'adm_1',
  reviewed_at: new Date(),
  reject_reason_code: 'unreadable_document',
  reject_note: 'The date of birth is not legible.',
  reject_item_keys: itemKeys,
  reject_acknowledged_keys: null,
  created_at: new Date(),
});

const client = (over: Partial<UserRow> = {}): UserRow => ({
  id: 'usr_1',
  role: 'client',
  status: 'active',
  email: 'client@test.test',
  email_verified_at: new Date(),
  phone_number: '+2348000000000',
  phone_verified_at: new Date(),
  password_hash: 'x',
  full_name: 'Ada Client',
  handle: null,
  handle_changed_at: null,
  avatar_url: null,
  selfie_upload_key: null,
  cover_photo_url: null,
  occupation: null,
  description: null,
  interests: ['health'],
  categories: [],
  is_available: true,
  kyc_status: 'none',
  kyc_submitted_at: null,
  kyc_reviewed_at: null,
  kyc_reject_reason: null,
  last_seen_at: null,
  suspended_until: null,
  deleted_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...over,
});

const itemFor = (items: KycItemSpec[], key: string): KycItemSpec | undefined =>
  items.find((i) => i.key === key);

describe('kyc spec — per-item status', () => {
  beforeEach(() => {
    submission = null;
  });

  it('reports a filled item verified and an empty one not_started', async () => {
    // full_name is set, client_selfie is not.
    const spec = await buildKycSpec(client());

    expect(itemFor(spec.items, 'full_name')?.status).toBe('verified');
    expect(itemFor(spec.items, 'client_selfie')?.status).toBe('not_started');
  });

  it('locks every item while the submission is under review', async () => {
    const spec = await buildKycSpec(client({ kyc_status: 'pending_review' }));

    for (const item of spec.items) {
      expect(item.status).toBe('under_review');
      expect(item.locked).toBe(true);
      // A lock the product cannot explain reads as a bug.
      expect(item.lock_reason).toBeTruthy();
    }
  });

  it('leaves everything unlocked and editable when nothing is in review', async () => {
    const spec = await buildKycSpec(client());

    for (const item of spec.items) {
      expect(item.locked).toBe(false);
      expect(item.lock_reason).toBeNull();
    }
  });

  it('flags only the rejected item and locks the rest', async () => {
    submission = rejectedSubmission(['client_selfie']);
    const spec = await buildKycSpec(client({ kyc_status: 'rejected' }));

    const selfie = itemFor(spec.items, 'client_selfie');
    const fullName = itemFor(spec.items, 'full_name');

    // The flagged item is the user's whole job: editable despite the rejection.
    expect(selfie?.status).toBe('action_needed');
    expect(selfie?.locked).toBe(false);

    // An item admin already accepted must not be quietly rewritten — the same
    // rule the PATCH handlers enforce server-side.
    expect(fullName?.status).toBe('verified');
    expect(fullName?.locked).toBe(true);
    expect(fullName?.lock_reason).toBeTruthy();
  });

  it('leaves every item editable on a whole-submission rejection', async () => {
    // Empty reject_item_keys means "redo everything" — there is no subset to
    // scope writes to, so locking any of it would strand the user.
    submission = rejectedSubmission([]);
    const spec = await buildKycSpec(client({ kyc_status: 'rejected' }));

    expect(spec.resubmission).toBeNull();
    for (const item of spec.items) {
      expect(item.locked).toBe(false);
      expect(item.status).not.toBe('action_needed');
    }
  });

  it('keeps completed_count counting locked-but-filled items', async () => {
    // The progress bar must not drop when a partial rejection arrives: those
    // items are still filled in, they are simply not this user's move.
    submission = rejectedSubmission(['client_selfie']);
    const spec = await buildKycSpec(client({ kyc_status: 'rejected' }));

    const locked = spec.items.filter((i) => i.locked && i.complete);
    expect(locked.length).toBeGreaterThan(0);
    expect(spec.completed_count).toBeGreaterThanOrEqual(locked.length);
  });

  it('never reports verified for an item with no value', async () => {
    // An approved user can still have an unfilled optional item. Calling that
    // verified is a lie the badge would repeat on every render.
    const spec = await buildKycSpec(client({ kyc_status: 'approved' }));

    for (const item of spec.items) {
      if (!item.complete) expect(item.status).not.toBe('verified');
    }
  });

  it('carries status, locked and lock_reason on every item', async () => {
    // Contract: the three fields are always present, so a client never has to
    // distinguish "absent" from "false".
    const spec = await buildKycSpec(client());

    for (const item of spec.items) {
      expect(typeof item.status).toBe('string');
      expect(typeof item.locked).toBe('boolean');
      expect(item).toHaveProperty('lock_reason');
    }
  });
});
