import { ServiceError, ServiceSuccess } from '@lib/service-result.js';
import { ERROR_CODES } from '@shared/constants/error-codes.js';
import { MESSAGE_KEYS } from '@shared/constants/message-keys.js';

import type {
  SingleEventDto,
  IngestEventDto,
  ListEventsQuery,
} from './call-session-events.schema.js';
import type {
  CallSessionEventRow,
  CallSessionEventView,
  CallSessionSummary,
} from './call-session-events.types.js';
import * as repo from './call-session-events.repo.js';

const toView = (row: CallSessionEventRow): CallSessionEventView => ({
  id: row.id,
  call_id: row.call_id,
  call_reference: row.call_reference,
  event: row.event,
  payload: row.payload,
  occurred_at: row.occurred_at.toISOString(),
  received_at: row.received_at.toISOString(),
});

const insertOne = async (
  callId: string,
  dto: SingleEventDto,
): Promise<ServiceSuccess<CallSessionEventView> | ServiceError> => {
  const occurred_at = new Date(dto.ts);
  if (isNaN(occurred_at.getTime())) {
    return new ServiceError(
      ERROR_CODES.VALIDATION_ERROR,
      MESSAGE_KEYS.CALL_SESSION_EVENT_INVALID_TS,
      400,
    );
  }
  const row = await repo.insertEvent({
    call_id: callId,
    call_reference: dto.call_reference ?? null,
    event: dto.event,
    payload: dto,
    occurred_at,
  });
  return new ServiceSuccess(toView(row), MESSAGE_KEYS.CALL_SESSION_EVENT_INGESTED);
};

// Accepts a single event or a batch. Returns the ingested view(s).
export const ingestEvent = async (
  callId: string,
  dto: IngestEventDto,
): Promise<ServiceSuccess<CallSessionEventView | CallSessionEventView[]> | ServiceError> => {
  if (Array.isArray(dto)) {
    const results: CallSessionEventView[] = [];
    for (const item of dto) {
      const r = await insertOne(callId, item);
      if (!r.success) return r; // abort batch on first bad ts
      results.push(r.data);
    }
    return new ServiceSuccess(results, MESSAGE_KEYS.CALL_SESSION_EVENT_INGESTED);
  }
  return insertOne(callId, dto);
};

export const listEvents = async (
  callId: string,
  query: ListEventsQuery,
): Promise<ServiceSuccess<CallSessionEventView[]> | ServiceError> => {
  const before = query.before ? new Date(query.before) : undefined;
  const rows = await repo.listByCallId(callId, query.limit, before);
  return new ServiceSuccess(rows.map(toView), MESSAGE_KEYS.CALL_SESSION_EVENTS_LISTED);
};

export const listEventsByReference = async (
  callReference: string,
  query: ListEventsQuery,
): Promise<ServiceSuccess<CallSessionEventView[]> | ServiceError> => {
  const rows = await repo.listByReference(callReference, query.limit);
  return new ServiceSuccess(rows.map(toView), MESSAGE_KEYS.CALL_SESSION_EVENTS_LISTED);
};

export const getSummary = async (
  callId: string,
): Promise<ServiceSuccess<CallSessionSummary> | ServiceError> => {
  const summary = await repo.getSummary(callId);
  if (!summary) {
    return new ServiceError(ERROR_CODES.NOT_FOUND, MESSAGE_KEYS.CALL_SESSION_EVENT_NOT_FOUND, 404);
  }
  return new ServiceSuccess(summary, MESSAGE_KEYS.CALL_SESSION_EVENTS_SUMMARY);
};
