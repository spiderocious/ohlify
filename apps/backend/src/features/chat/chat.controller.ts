import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { decodeCursor } from '@lib/pagination.js';
import { ResponseUtil } from '@lib/response.js';

import type {
  OpenConversationDto,
  ProposeScheduleDto,
  RescheduleDto,
  ScheduleActionDto,
  SendMessageDto,
} from './chat.schema.js';
import * as service from './chat.service.js';

const readCursorSortKey = (raw: unknown): string | null => {
  if (typeof raw !== 'string' || raw === '') return null;
  try {
    return decodeCursor(raw).last_sort_key;
  } catch {
    return null;
  }
};

const readLimit = (raw: unknown): number | undefined => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export const listConversations: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const cursorIso = readCursorSortKey(req.query['cursor']);
    const r = await service.listConversations(
      req.userId!,
      readLimit(req.query['limit']),
      cursorIso,
    );
    ResponseUtil.ok(res, r.data.items, r.data.meta);
  },
);

export const open: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.body as OpenConversationDto;
  const r = await service.openConversation(req.userId!, dto.professional_id);
  if (!r.success) bail(r);
  else ResponseUtil.created(res, r.data);
});

export const listMessages: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const beforeId = readCursorSortKey(req.query['cursor']);
  const r = await service.listMessages(
    String(req.params['id']),
    req.userId!,
    readLimit(req.query['limit']),
    beforeId,
  );
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data.items, r.data.meta);
});

export const send: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.body as SendMessageDto;
  const r = await service.sendMessage(String(req.params['id']), req.userId!, dto.body);
  if (!r.success) bail(r);
  else ResponseUtil.created(res, r.data);
});

export const markRead: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.markConversationRead(String(req.params['id']), req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const unreadCount: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.getUnreadCount(req.userId!);
  ResponseUtil.ok(res, r.data);
});

// Peer + minutes balance + low threshold + live schedule — powers the thread's
// "credits running low" banner and the Call button.
export const context: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.getConversationContext(String(req.params['id']), req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const proposeSchedule: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.body as ProposeScheduleDto;
  const r = await service.proposeSchedule(
    String(req.params['id']),
    req.userId!,
    dto.scheduled_at,
    dto.note,
  );
  if (!r.success) bail(r);
  else ResponseUtil.created(res, r.data);
});

// accept | decline | cancel a schedule card.
export const scheduleAction: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.body as ScheduleActionDto;
  const r = await service.actOnSchedule(String(req.params['messageId']), req.userId!, dto.action);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

// Reschedule = cancel the old proposal + raise a new one (proposer only).
export const reschedule: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.body as RescheduleDto;
  const r = await service.reschedule(
    String(req.params['messageId']),
    req.userId!,
    dto.scheduled_at,
    dto.note,
  );
  if (!r.success) bail(r);
  else ResponseUtil.created(res, r.data);
});
