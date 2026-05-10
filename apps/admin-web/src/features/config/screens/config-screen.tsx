import { useEffect, useMemo, useState } from 'react';

import { AppButton, AppText, AppTextAreaInput, cn } from '@ohlify/ui';
import type { AdminConfigItem } from '@ohlify/api';

import { PageHeader } from '../../../shared/parts/page-header.js';
import { QueryView } from '../../../shared/parts/empty-or-error.js';
import { StatusPill } from '../../../shared/parts/status-pill.js';
import { promptForReason, toastError, toastSuccess } from '../../../shared/lib/confirm.js';
import { formatDateTime } from '../../../shared/format/datetime.js';
import { UserLink } from '../../../shared/parts/user-link.js';
import { useAdminConfig, usePatchConfig } from '../api/use-config.js';

function jsonOrString(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * Tries to parse the textarea content as JSON. Falls back to the raw string
 * when the input isn't valid JSON — this lets simple string configs stay
 * editable as plain text rather than requiring quotes.
 */
function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function ConfigScreen() {
  const cfg = useAdminConfig();
  const patch = usePatchConfig();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  // Index by key for diffing — backend returns an array, not a record.
  const original = useMemo<Record<string, AdminConfigItem>>(() => {
    const out: Record<string, AdminConfigItem> = {};
    for (const row of cfg.data ?? []) out[row.key] = row;
    return out;
  }, [cfg.data]);

  useEffect(() => {
    if (!cfg.data) return;
    const seed: Record<string, string> = {};
    for (const row of cfg.data) seed[row.key] = jsonOrString(row.value);
    setDrafts(seed);
  }, [cfg.data]);

  const dirtyKeys = useMemo(() => {
    const out: string[] = [];
    for (const [k, raw] of Object.entries(drafts)) {
      const orig = original[k] ? jsonOrString(original[k].value) : undefined;
      if (raw !== orig) out.push(k);
    }
    return out;
  }, [drafts, original]);

  const onSave = async () => {
    if (dirtyKeys.length === 0) {
      toastError('Nothing to save');
      return;
    }
    const note = await promptForReason({
      title: `Save ${dirtyKeys.length} config change${dirtyKeys.length === 1 ? '' : 's'}?`,
      message: 'Required: explain why this change is being made (logged with before/after).',
      placeholder: 'e.g. Lowering platform fee from 10% to 8% per finance review',
    });
    if (!note) return;

    const updates = dirtyKeys.map((key) => ({ key, value: tryParseJson(drafts[key] ?? '') }));
    patch.mutate(
      { updates, note },
      {
        onSuccess: () => toastSuccess(`Saved ${updates.length} key(s)`),
        onError: (err) => toastError(err),
      },
    );
  };

  return (
    <>
      <PageHeader
        title="Platform config"
        subtitle="Runtime knobs. Edits require a note and are audit-logged with before/after."
        actions={
          <div className="flex items-center gap-3">
            {dirtyKeys.length > 0 && (
              <AppText variant="bodySmall" className="text-amber-700">
                {dirtyKeys.length} unsaved change{dirtyKeys.length === 1 ? '' : 's'}
              </AppText>
            )}
            <AppButton
              label="Save changes"
              variant="solid"
              height={36}
              isLoading={patch.isPending}
              onPressed={dirtyKeys.length > 0 ? onSave : undefined}
            />
          </div>
        }
      />

      <div className="px-6 py-6">
        <QueryView isLoading={cfg.isLoading} error={cfg.error}>
          {cfg.data && (
            <div className="flex flex-col gap-3">
              {cfg.data.map((row) => {
                const isDirty = dirtyKeys.includes(row.key);
                return (
                  <div
                    key={row.key}
                    className={cn(
                      'rounded-lg border bg-surface p-4 transition',
                      isDirty ? 'border-amber-300 bg-amber-50/30' : 'border-border',
                    )}
                  >
                    <div className="mb-2 flex flex-wrap items-baseline gap-2">
                      <code className="text-sm font-bold text-text-primary">{row.key}</code>
                      {row.is_public && <StatusPill label="Public" tone="info" />}
                      {isDirty && <StatusPill label="Modified" tone="warning" />}
                      <span className="flex-1" />
                      <AppText variant="bodySmall" className="text-text-muted">
                        Updated {formatDateTime(row.updated_at)}
                        {row.updated_by && (
                          <>
                            {' '}by <UserLink userId={row.updated_by} idLen={10} />
                          </>
                        )}
                      </AppText>
                    </div>
                    <AppTextAreaInput
                      value={drafts[row.key] ?? ''}
                      onChange={(v) => setDrafts((d) => ({ ...d, [row.key]: v }))}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </QueryView>
      </div>
    </>
  );
}
