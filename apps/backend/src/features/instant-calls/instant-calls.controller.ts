import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { ResponseUtil } from '@lib/response.js';

import type {
  EndCallDto,
  InviteToCallDto,
  RespondToInviteDto,
  RespondToRingDto,
  StartCallDto,
} from './instant-calls.schema.js';
import * as inviteService from './call-invites.service.js';
import * as service from './instant-calls.service.js';

export const start: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.startCall(req.body as StartCallDto, req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.created(res, r.data);
});

export const answer: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.answerCall(String(req.params['id']), req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const pause: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.pauseCall(String(req.params['id']), req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const resume: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.resumeCall(String(req.params['id']), req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const end: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const dto = req.body as EndCallDto;
  const r = await service.endCall(String(req.params['id']), req.userId!, dto.connected_seconds);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const listParticipants: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const r = await inviteService.listParticipants(String(req.params['id']), req.userId!);
    if (!r.success) bail(r);
    else ResponseUtil.ok(res, r.data);
  },
);

export const invite: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await inviteService.invite({
    callId: String(req.params['id']),
    inviterUserId: req.userId!,
    handle: (req.body as InviteToCallDto).handle,
  });
  if (!r.success) bail(r);
  else ResponseUtil.created(res, r.data);
});

export const respondToInvite: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await inviteService.resolveInvite({
    callId: String(req.params['id']),
    participantId: String(req.params['participantId']),
    professionalUserId: req.userId!,
    approve: (req.body as RespondToInviteDto).approve,
  });
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const respondToRing: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await inviteService.respondToRing({
    callId: String(req.params['id']),
    userId: req.userId!,
    accept: (req.body as RespondToRingDto).accept,
  });
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});
