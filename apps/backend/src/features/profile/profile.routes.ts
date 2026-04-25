import { Router } from 'express';
import type { Express } from 'express';

import { validate } from '@lib/http/validateRequest.js';
import { requireAuth } from '@middlewares/auth.middleware.js';

import * as controller from './profile.controller.js';
import {
  ChangeEmailSchema,
  ChangePhoneSchema,
  DeleteAccountSchema,
  NotificationPreferencesPatchSchema,
  PatchMeSchema,
  PostAvatarSchema,
  PutBankAccountSchema,
  VerifyOtpOnlySchema,
} from './profile.schema.js';

export const register = (app: Express): void => {
  const meRouter = Router();

  // Identity
  meRouter.get('/', requireAuth, controller.getMe);
  meRouter.patch('/', requireAuth, validate(PatchMeSchema), controller.patchMe);
  meRouter.delete('/', requireAuth, validate(DeleteAccountSchema), controller.deleteAccount);

  // Email change + verify
  meRouter.post('/email', requireAuth, validate(ChangeEmailSchema), controller.changeEmail);
  meRouter.post(
    '/email/verify',
    requireAuth,
    validate(VerifyOtpOnlySchema),
    controller.verifyEmail,
  );

  // Phone change + verify
  meRouter.post('/phone', requireAuth, validate(ChangePhoneSchema), controller.changePhone);
  meRouter.post(
    '/phone/verify',
    requireAuth,
    validate(VerifyOtpOnlySchema),
    controller.verifyPhone,
  );

  // Notification preferences
  meRouter.get('/notification-preferences', requireAuth, controller.getPreferences);
  meRouter.patch(
    '/notification-preferences',
    requireAuth,
    validate(NotificationPreferencesPatchSchema),
    controller.patchPreferences,
  );

  // Bank account
  meRouter.get('/bank-account', requireAuth, controller.getBankAccount);
  meRouter.put(
    '/bank-account',
    requireAuth,
    validate(PutBankAccountSchema),
    controller.putBankAccount,
  );
  meRouter.delete('/bank-account', requireAuth, controller.deleteBankAccount);

  // Avatar (file_key from uploads microservice)
  meRouter.post('/avatar', requireAuth, validate(PostAvatarSchema), controller.setAvatar);
  meRouter.delete('/avatar', requireAuth, controller.removeAvatar);

  app.use('/api/v1/me', meRouter);
};
