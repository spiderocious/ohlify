import type { Request, Response, RequestHandler } from 'express';

import { asyncHandler } from '@lib/http/asyncHandler.js';
import { bail } from '@lib/http/bail.js';
import { requestMeta } from '@lib/http/request-meta.js';
import { ResponseUtil } from '@lib/response.js';
import { ERROR_CODES, severityFor } from '@shared/constants/error-codes.js';
import { resolveErrorMessage } from '@shared/constants/error-messages.js';
import { HTTP_STATUS } from '@shared/constants/http-status.js';

import type {
  ChangeHandleDto,
  ClientKycPatchDto,
  ProfessionalKycPatchDto,
  SetRoleDto,
} from './onboarding.schema.js';
import { HandleCheckSchema } from './onboarding.schema.js';
import * as service from './onboarding.service.js';
import * as kycSpecService from './onboarding.kyc-spec.js';

export const getStatus: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.getStatus(req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const setRole: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.setRole(req.body as SetRoleDto, req.userId!, requestMeta(req));
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const patchClientKyc: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.patchClientKyc(req.body as ClientKycPatchDto, req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const patchProfessionalKyc: RequestHandler = asyncHandler(
  async (req: Request, res: Response) => {
    const r = await service.patchProfessionalKyc(req.body as ProfessionalKycPatchDto, req.userId!);
    if (!r.success) bail(r);
    else ResponseUtil.ok(res, r.data);
  },
);

export const checkHandle: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const parsed = HandleCheckSchema.safeParse({ handle: req.query['handle'] });
  if (!parsed.success) {
    ResponseUtil.error(res, HTTP_STATUS.BAD_REQUEST, {
      errorCode: severityFor(ERROR_CODES.VALIDATION_ERROR),
      errorMessage: resolveErrorMessage(ERROR_CODES.VALIDATION_ERROR),
      reason: ERROR_CODES.VALIDATION_ERROR,
      fieldErrors: { handle: ['handle is required'] },
    });
    return;
  }
  const r = await service.checkHandle(parsed.data);
  ResponseUtil.ok(res, r.data);
});

export const changeHandle: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.changeHandle(req.body as ChangeHandleDto, req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const completeKyc: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await service.completeKyc(req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});

export const getKycSpec: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
  const r = await kycSpecService.getSpec(req.userId!);
  if (!r.success) bail(r);
  else ResponseUtil.ok(res, r.data);
});
