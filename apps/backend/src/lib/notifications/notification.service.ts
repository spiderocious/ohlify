import { Queue } from 'bullmq';

import { logger } from '@lib/logger.js';

import { env } from '../../env.js';

import { type EmailJobPayload } from './email-worker.js';
import { otpEmailTemplate } from './templates/otp-email.js';
import { walletEmailTemplates } from './templates/wallet-events.js';
import { welcomeEmailTemplate } from './templates/welcome-email.js';

type OtpPurpose =
  | 'register'
  | 'login'
  | 'forgot_password'
  | 'change_email'
  | 'change_phone'
  | 'change_password'
  | 'delete_account'
  | 'public_guest';

const emailQueue = new Queue<EmailJobPayload>('email', {
  connection: { url: env.REDIS_URL },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  await emailQueue.add('send', { to, subject, html });
};

export const notificationService = {
  async sendEmailOtp(
    to: string,
    otp: string,
    purpose: OtpPurpose,
    expiresInMinutes: number,
  ): Promise<void> {
    const subject = otpEmailTemplate.subject({ otp, purpose, expiresInMinutes });
    const html = otpEmailTemplate.html({ otp, purpose, expiresInMinutes });
    await sendEmail(to, subject, html);
  },

  sendSmsOtp(to: string, otp: string, purpose: OtpPurpose): void {
    logger.warn({ to, purpose, otp }, 'SMS OTP not implemented — skipping send');
  },

  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    const subject = welcomeEmailTemplate.subject();
    const html = welcomeEmailTemplate.html({ name });
    await sendEmail(to, subject, html);
  },

  async sendWalletEvent(
    to: string,
    kind:
      | 'call_payment_reserved'
      | 'call_settled'
      | 'call_refunded'
      | 'withdrawal_requested'
      | 'withdrawal_completed'
      | 'withdrawal_reversed',
    ctx: { amountKobo: string; currency?: string; reason?: string },
  ): Promise<void> {
    const currency = ctx.currency ?? 'NGN';
    let tpl: { subject: string; html: string };
    switch (kind) {
      case 'call_payment_reserved':
        tpl = walletEmailTemplates.callPaymentReserved({ amountKobo: ctx.amountKobo, currency });
        break;
      case 'call_settled':
        tpl = walletEmailTemplates.callSettled({ amountKobo: ctx.amountKobo, currency });
        break;
      case 'call_refunded':
        tpl = walletEmailTemplates.callRefunded({ amountKobo: ctx.amountKobo, currency });
        break;
      case 'withdrawal_requested':
        tpl = walletEmailTemplates.withdrawalRequested({ amountKobo: ctx.amountKobo, currency });
        break;
      case 'withdrawal_completed':
        tpl = walletEmailTemplates.withdrawalCompleted({ amountKobo: ctx.amountKobo, currency });
        break;
      case 'withdrawal_reversed':
        tpl = walletEmailTemplates.withdrawalReversed({
          amountKobo: ctx.amountKobo,
          currency,
          ...(ctx.reason !== undefined ? { reason: ctx.reason } : {}),
        });
        break;
    }
    await sendEmail(to, tpl.subject, tpl.html);
  },
};
