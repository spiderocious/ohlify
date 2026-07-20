import { useState } from 'react';

import { AppButton, AppText, AppTextAreaInput } from '@ohlify/ui';

export interface ConfigDiffEntry {
  key: string;
  label: string;
  /** Decoded display strings — same form the input field shows (e.g. "500" for money_kobo, "true"/"false" for boolean). */
  before: string;
  after: string;
}

interface ConfigSaveDiffModalProps {
  entries: ConfigDiffEntry[];
  onSubmit: (note: string) => void;
  onCancel: () => void;
}

/**
 * Body for the "save config changes" custom modal — lists every dirty key
 * with its old → new value above the required change-note textarea, so the
 * operator can see exactly what they're about to ship before confirming.
 * Replaces the old plain promptForReason() call, which only said "N config
 * changes?" with no detail.
 */
export function ConfigSaveDiffModal({ entries, onSubmit, onCancel }: ConfigSaveDiffModalProps) {
  const [note, setNote] = useState('');
  const trimmed = note.trim();

  return (
    <div className="flex flex-col gap-4">
      <AppText variant="body" className="text-text-muted">
        Required: explain why this change is being made (logged with before/after).
      </AppText>

      <div className="flex max-h-64 flex-col gap-2 overflow-y-auto rounded-lg border border-border bg-surface-light p-3">
        {entries.map((entry) => (
          <div
            key={entry.key}
            className="flex flex-col gap-0.5 border-b border-border/60 pb-2 last:border-b-0 last:pb-0"
          >
            <div className="flex items-baseline justify-between gap-2">
              <AppText variant="bodySmall" className="font-semibold text-text-primary">
                {entry.label}
              </AppText>
              <code className="text-[10px] text-text-muted">{entry.key}</code>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              <span className="rounded bg-red-50 px-1.5 py-0.5 font-mono text-xs text-red-700 line-through">
                {entry.before === '' ? '(empty)' : entry.before}
              </span>
              <span className="text-text-muted">→</span>
              <span className="rounded bg-green-50 px-1.5 py-0.5 font-mono text-xs text-green-700">
                {entry.after === '' ? '(empty)' : entry.after}
              </span>
            </div>
          </div>
        ))}
      </div>

      <AppTextAreaInput
        value={note}
        placeholder="e.g. Lowering platform fee from 15% to 10% per finance review"
        onChange={setNote}
      />

      <div className="flex flex-col gap-2">
        <AppButton
          label="Submit"
          variant="solid"
          expanded
          radius={100}
          isDisabled={trimmed === ''}
          onPressed={trimmed === '' ? undefined : () => onSubmit(trimmed)}
        />
        <AppButton label="Cancel" variant="outline" expanded radius={100} onPressed={onCancel} />
      </div>
    </div>
  );
}
