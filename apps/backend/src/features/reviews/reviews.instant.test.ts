import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocked before the service is imported — the service resolves these at module
// load, so hoisting matters.
vi.mock('@features/instant-calls/instant-calls.repo.js', () => ({
  findById: vi.fn(),
}));
vi.mock('./reviews.repo.js', () => ({
  findByInstantCallId: vi.fn(),
  findByCallId: vi.fn(),
  create: vi.fn(),
}));
vi.mock('@features/calls/calls.repo.js', () => ({ findById: vi.fn() }));
vi.mock('@features/bookings/bookings.repo.js', () => ({ findById: vi.fn() }));
vi.mock('@features/admin/admin.audit.repo.js', () => ({ trailFor: vi.fn() }));
vi.mock('@lib/db/pool.js', () => ({ pool: { connect: vi.fn(), query: vi.fn() } }));
vi.mock('@lib/outbox/index.js', () => ({
  insertEvent: vi.fn(),
  OutboxAggregateType: { CALL: 'call' },
  OutboxEventType: { REVIEW_POSTED: 'review.posted' },
}));

import * as instantCallsRepo from '@features/instant-calls/instant-calls.repo.js';
import { InstantCallStatus } from '@features/instant-calls/instant-calls.types.js';
import { ServiceError } from '@lib/service-result.js';

import * as repo from './reviews.repo.js';
import { postRating } from './reviews.service.js';

const CALLER = 'u_caller';
const CALLEE = 'u_callee';

const instantCall = (over: Partial<Record<string, unknown>> = {}) =>
  ({
    id: 'ic_test',
    caller_user_id: CALLER,
    callee_user_id: CALLEE,
    status: InstantCallStatus.ENDED,
    connected_seconds: 90,
    ...over,
  }) as never;

const dto = { rating: 5 } as never;

describe('postRating — instant calls', () => {
  beforeEach(() => vi.clearAllMocks());

  it('routes an ic_ id away from the scheduled calls table', async () => {
    // The reported bug: mobile posts the instant-call id, `calls` had no such
    // row, and the user was told they could not review the call.
    vi.mocked(instantCallsRepo.findById).mockResolvedValue(instantCall());
    vi.mocked(repo.findByInstantCallId).mockResolvedValue({ id: 'rv_1' } as never);

    const res = await postRating('ic_test', dto, CALLER);

    expect(instantCallsRepo.findById).toHaveBeenCalledWith('ic_test');
    // Reaching the duplicate check proves eligibility passed — the old code
    // never got this far.
    expect(res).toBeInstanceOf(ServiceError);
    expect((res as ServiceError).errorCode).toBe('review_exists');
  });

  it('404s an instant call that does not exist', async () => {
    vi.mocked(instantCallsRepo.findById).mockResolvedValue(null);

    const res = await postRating('ic_missing', dto, CALLER);

    expect((res as ServiceError).errorCode).toBe('call_not_found');
    expect((res as ServiceError).httpStatus).toBe(404);
  });

  it('refuses a call that has not ended', async () => {
    vi.mocked(instantCallsRepo.findById).mockResolvedValue(
      instantCall({ status: InstantCallStatus.ACTIVE }),
    );

    const res = await postRating('ic_test', dto, CALLER);

    expect((res as ServiceError).errorCode).toBe('review_not_eligible');
    expect((res as ServiceError).httpStatus).toBe(409);
  });

  it('refuses a call that never connected', async () => {
    // A cancelled ring settles as ended with zero seconds; there is nothing
    // to rate.
    vi.mocked(instantCallsRepo.findById).mockResolvedValue(
      instantCall({ connected_seconds: 0 }),
    );

    const res = await postRating('ic_test', dto, CALLER);

    expect((res as ServiceError).errorCode).toBe('review_not_eligible');
  });

  it('refuses the professional rating their own caller', async () => {
    // Attribution is one-direction: consumer rates provider.
    vi.mocked(instantCallsRepo.findById).mockResolvedValue(instantCall());

    const res = await postRating('ic_test', dto, CALLEE);

    expect((res as ServiceError).errorCode).toBe('review_not_eligible');
    expect((res as ServiceError).httpStatus).toBe(403);
  });

  it('leaves scheduled ids on the scheduled path', async () => {
    const callsRepo = await import('@features/calls/calls.repo.js');
    vi.mocked(callsRepo.findById).mockResolvedValue(null);

    await postRating('c_scheduled', dto, CALLER);

    expect(callsRepo.findById).toHaveBeenCalledWith('c_scheduled');
    expect(instantCallsRepo.findById).not.toHaveBeenCalled();
  });
});
