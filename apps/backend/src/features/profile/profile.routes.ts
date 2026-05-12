import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { requireAuth } from '@middlewares/auth.middleware.js';
import { requireActiveUser } from '@middlewares/requireActiveUser.middleware.js';

import * as controller from './profile.controller.js';
import {
  ChangeEmailSchema,
  ChangePhoneSchema,
  DeleteAccountSchema,
  DeleteDeviceTokenSchema,
  NotificationPreferencesPatchSchema,
  PatchMeSchema,
  PostAvatarSchema,
  PutBankAccountSchema,
  PutBookingBlocksSchema,
  RegisterDeviceTokenSchema,
  VerifyOtpOnlySchema,
} from './profile.schema.js';

export const register = (app: Express): void => {
  const meRouter = Router();

  // Every /me/* route requires the JWT-derived user to still exist (not soft-
  // deleted). Closes QA F-02. Services keep their own `user.deleted_at` checks
  // as a defense-in-depth net but the middleware short-circuits before them.
  meRouter.use(requireAuth, requireActiveUser);

  // Identity
  meRouter.get('/', controller.getMe);
  meRouter.patch('/', validate(PatchMeSchema), controller.patchMe);
  meRouter.delete('/', validate(DeleteAccountSchema), controller.deleteAccount);

  // Email change + verify
  meRouter.post('/email', validate(ChangeEmailSchema), controller.changeEmail);
  meRouter.post('/email/verify', validate(VerifyOtpOnlySchema), controller.verifyEmail);

  // Phone change + verify
  meRouter.post('/phone', validate(ChangePhoneSchema), controller.changePhone);
  meRouter.post('/phone/verify', validate(VerifyOtpOnlySchema), controller.verifyPhone);

  // Notification preferences
  meRouter.get('/notification-preferences', controller.getPreferences);
  meRouter.patch(
    '/notification-preferences',
    validate(NotificationPreferencesPatchSchema),
    controller.patchPreferences,
  );

  // Bank account
  meRouter.get('/bank-account', controller.getBankAccount);
  meRouter.put('/bank-account', validate(PutBankAccountSchema), controller.putBankAccount);
  meRouter.delete('/bank-account', controller.deleteBankAccount);

  // Avatar (file_key from uploads microservice)
  meRouter.post('/avatar', validate(PostAvatarSchema), controller.setAvatar);
  meRouter.delete('/avatar', controller.removeAvatar);

  // Booking blocks (pro-only — service enforces role)
  meRouter.get('/booking-blocks', controller.getBookingBlocks);
  meRouter.put(
    '/booking-blocks',
    validate(PutBookingBlocksSchema),
    controller.putBookingBlocks,
  );

  // Device tokens — push notification targets. Re-POST is idempotent;
  // DELETE removes a single token (used on logout).
  meRouter.post(
    '/device-tokens',
    validate(RegisterDeviceTokenSchema),
    controller.registerDeviceToken,
  );
  meRouter.delete(
    '/device-tokens',
    validate(DeleteDeviceTokenSchema),
    controller.deleteDeviceToken,
  );

  app.use('/api/v1/me', meRouter);
};
