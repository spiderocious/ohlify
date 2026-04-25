import { Worker } from 'bullmq';
import { Resend } from 'resend';

import { logger } from '@lib/logger.js';

import { env } from '../../env.js';

export interface EmailJobPayload {
  to: string;
  subject: string;
  html: string;
}

const resend = new Resend(env.RESEND_API_KEY);

export const createEmailWorker = (redisUrl: string): Worker<EmailJobPayload> =>
  new Worker<EmailJobPayload>(
    'email',
    async (job) => {
      const { to, subject, html } = job.data;
      const { error } = await resend.emails.send({
        from: env.RESEND_FROM_EMAIL,
        to,
        subject,
        html,
      });
      if (error) {
        logger.error({ error, to, subject }, 'email send failed');
        throw new Error(error.message);
      }
      logger.info({ to, subject }, 'email sent');
    },
    {
      connection: { url: redisUrl },
      concurrency: 5,
    },
  );
