import { useState } from 'react';

import { AppButton, AppText, AppTextAreaInput, AppTextInput, cn } from '@ohlify/ui';
import { idempotencyKey } from '@ohlify/core';

import { PageHeader } from '../../../shared/parts/page-header.js';
import { confirm, toastError, toastSuccess } from '../../../shared/lib/confirm.js';
import { formatKobo, sumKobo } from '../../../shared/format/kobo.js';
import { useAdminCredit, useAdminDebit, usePostManualJournal } from '../api/use-wallet.js';

interface LineDraft {
  id: string;
  account_code: string;
  user_id: string;
  amount_kobo: string;
  memo: string;
}

function emptyLine(): LineDraft {
  return {
    id: Math.random().toString(36).slice(2),
    account_code: '',
    user_id: '',
    amount_kobo: '',
    memo: '',
  };
}

export function ManualJournalScreen() {
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<LineDraft[]>([emptyLine(), emptyLine()]);
  const post = usePostManualJournal();

  const updateLine = (id: string, patch: Partial<LineDraft>) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const removeLine = (id: string) =>
    setLines((prev) => (prev.length > 2 ? prev.filter((l) => l.id !== id) : prev));

  const numericLines = lines
    .filter((l) => l.account_code.trim() && l.amount_kobo.trim())
    .map((l) => ({ ...l, amount_num: Number(l.amount_kobo) }));

  const sum = sumKobo(numericLines.map((l) => l.amount_num));
  const balanced = sum === 0n && numericLines.length >= 2;

  const onSubmit = async () => {
    if (!balanced) return;
    if (
      !(await confirm({
        title: 'Post manual journal?',
        message: 'Lines must sum to zero. This is an irreversible ledger write.',
        destructive: true,
      }))
    )
      return;
    // Map to the backend contract: description→note, account_code→account_id,
    // amount_kobo→signed_amount_kobo. The schema carries a single top-level
    // related_user_id (not per-line), so take the first line that names one.
    // (BUGS.md M9.)
    const relatedUserId = numericLines.find((l) => l.user_id.trim())?.user_id.trim();
    post.mutate(
      {
        note: description || 'manual journal',
        idempotency_key: idempotencyKey(),
        ...(relatedUserId ? { related_user_id: relatedUserId } : {}),
        lines: numericLines.map((l) => ({
          account_id: l.account_code,
          signed_amount_kobo: l.amount_num,
        })),
      },
      {
        onSuccess: () => {
          toastSuccess('Journal posted');
          setDescription('');
          setLines([emptyLine(), emptyLine()]);
        },
        onError: (err) => toastError(err),
      },
    );
  };

  return (
    <>
      <PageHeader
        title="Manual journal"
        subtitle="Direct double-entry write. Use with extreme care."
      />

      <div className="px-6 py-6">
        <div className="rounded-lg border border-border bg-surface p-5">
          <AppTextAreaInput
            label="Description"
            placeholder="What is this journal for?"
            value={description}
            onChange={setDescription}
          />

          <div className="mt-5 flex items-center justify-between">
            <AppText variant="bodyTitle">Lines</AppText>
            <AppText variant="bodySmall" className="text-text-muted">
              Sum:{' '}
              <span className={cn('font-semibold', balanced ? 'text-emerald-700' : 'text-red-700')}>
                {formatKobo(sum.toString(), { signed: true })}
              </span>
            </AppText>
          </div>

          <div className="mt-3 flex flex-col gap-3">
            {lines.map((l) => (
              <div
                key={l.id}
                className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 lg:grid-cols-[1fr_1fr_180px_1.4fr_auto]"
              >
                <AppTextInput
                  label="Account"
                  placeholder="e.g. user_wallet"
                  value={l.account_code}
                  onChange={(v) => updateLine(l.id, { account_code: v })}
                />
                <AppTextInput
                  label="User ID (optional)"
                  placeholder="user uuid"
                  value={l.user_id}
                  onChange={(v) => updateLine(l.id, { user_id: v })}
                />
                <AppTextInput
                  label="Amount (kobo)"
                  inputType="number"
                  inputMode="numeric"
                  placeholder="signed integer"
                  value={l.amount_kobo}
                  onChange={(v) => updateLine(l.id, { amount_kobo: v })}
                />
                <AppTextInput
                  label="Memo"
                  placeholder="optional"
                  value={l.memo}
                  onChange={(v) => updateLine(l.id, { memo: v })}
                />
                <div className="flex items-end pb-1">
                  <AppButton
                    label="Remove"
                    variant="outline"
                    height={36}
                    onPressed={lines.length > 2 ? () => removeLine(l.id) : undefined}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <AppButton
              label="Add line"
              variant="outline"
              height={36}
              onPressed={() => setLines((p) => [...p, emptyLine()])}
            />
          </div>

          <div className="mt-6 flex items-center gap-3">
            <AppButton
              label="Post journal"
              variant="solid"
              height={44}
              isLoading={post.isPending}
              onPressed={balanced ? onSubmit : undefined}
            />
            {!balanced && (
              <AppText variant="bodySmall" className="text-text-muted">
                Lines must sum to ₦0.00 and have at least 2 valid entries.
              </AppText>
            )}
          </div>
        </div>

        <CreditDebitPanel />
      </div>
    </>
  );
}

function CreditDebitPanel() {
  const credit = useAdminCredit();
  const debit = useAdminDebit();
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');

  const submit = (kind: 'credit' | 'debit') => async () => {
    const num = Number(amount);
    if (!userId || !Number.isFinite(num) || num <= 0 || !memo) return;
    if (
      !(await confirm({
        title: `${kind === 'credit' ? 'Credit' : 'Debit'} user?`,
        message: `${formatKobo(num)} ${kind === 'credit' ? 'into' : 'out of'} ${userId}.`,
        destructive: kind === 'debit',
      }))
    )
      return;
    const fn = kind === 'credit' ? credit : debit;
    // Backend field is `reason`, not `memo`. (BUGS.md M9.)
    fn.mutate(
      { user_id: userId, amount_kobo: num, reason: memo, idempotency_key: idempotencyKey() },
      {
        onSuccess: () => {
          toastSuccess(`${kind === 'credit' ? 'Credited' : 'Debited'}`);
          setAmount('');
          setMemo('');
        },
        onError: (err) => toastError(err),
      },
    );
  };

  const valid = userId !== '' && Number(amount) > 0 && memo !== '';

  return (
    <div className="mt-6 rounded-lg border border-border bg-surface p-5">
      <AppText variant="bodyTitle">Quick credit / debit</AppText>
      <AppText variant="bodySmall" className="text-text-muted">
        Adjusts a single user's wallet against the platform_revenue account.
      </AppText>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <AppTextInput label="User ID" placeholder="user uuid" value={userId} onChange={setUserId} />
        <AppTextInput
          label="Amount (kobo)"
          inputType="number"
          inputMode="numeric"
          placeholder="positive integer"
          value={amount}
          onChange={setAmount}
        />
        <AppTextInput label="Memo" placeholder="why" value={memo} onChange={setMemo} />
      </div>

      <div className="mt-4 flex gap-3">
        <AppButton
          label="Credit"
          variant="solid"
          height={36}
          isLoading={credit.isPending}
          onPressed={valid ? submit('credit') : undefined}
        />
        <AppButton
          label="Debit"
          variant="outline"
          height={36}
          isLoading={debit.isPending}
          onPressed={valid ? submit('debit') : undefined}
        />
      </div>
    </div>
  );
}
