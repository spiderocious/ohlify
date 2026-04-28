// Plain-text email templates for slice B wallet events. Intentionally simple
// — the marketing-quality templates can ship later. Subjects and bodies are
// in english only for now.

interface MoneyContext {
  amountKobo: string;
  currency: string;
}

const formatKobo = (kobo: string, currency: string): string => {
  const n = Number(kobo);
  if (!Number.isFinite(n)) return `${kobo} ${currency}`;
  const naira = n / 100;
  return `${currency === 'NGN' ? '₦' : ''}${naira.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const walletEmailTemplates = {
  callPaymentReserved: (ctx: MoneyContext): { subject: string; html: string } => ({
    subject: 'Payment reserved on Ohlify',
    html: `<p>We've reserved <strong>${formatKobo(ctx.amountKobo, ctx.currency)}</strong> from your Ohlify wallet for an upcoming call.</p><p>If the call doesn't happen, the money goes back to your wallet automatically.</p>`,
  }),

  callSettled: (ctx: MoneyContext): { subject: string; html: string } => ({
    subject: 'You earned on Ohlify',
    html: `<p>Your call settled. <strong>${formatKobo(ctx.amountKobo, ctx.currency)}</strong> has been credited to your wallet.</p>`,
  }),

  callRefunded: (ctx: MoneyContext): { subject: string; html: string } => ({
    subject: 'Refund issued on Ohlify',
    html: `<p>A refund of <strong>${formatKobo(ctx.amountKobo, ctx.currency)}</strong> has been credited back to your Ohlify wallet.</p>`,
  }),

  withdrawalRequested: (ctx: MoneyContext): { subject: string; html: string } => ({
    subject: 'Withdrawal requested on Ohlify',
    html: `<p>Your withdrawal of <strong>${formatKobo(ctx.amountKobo, ctx.currency)}</strong> is being processed. We'll let you know once your bank confirms.</p>`,
  }),

  withdrawalCompleted: (ctx: MoneyContext): { subject: string; html: string } => ({
    subject: 'Withdrawal sent on Ohlify',
    html: `<p>Your withdrawal of <strong>${formatKobo(ctx.amountKobo, ctx.currency)}</strong> has been sent to your bank account. It should arrive within minutes.</p>`,
  }),

  withdrawalReversed: (
    ctx: MoneyContext & { reason?: string },
  ): { subject: string; html: string } => {
    const reasonHtml = ctx.reason ? `<p>Reason: ${ctx.reason}</p>` : '';
    return {
      subject: 'Withdrawal failed on Ohlify',
      html: `<p>Your withdrawal of <strong>${formatKobo(ctx.amountKobo, ctx.currency)}</strong> could not be completed. The funds have been returned to your Ohlify wallet.</p>${reasonHtml}`,
    };
  },
};
