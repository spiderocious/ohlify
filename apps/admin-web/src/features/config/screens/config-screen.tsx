import { useEffect, useMemo, useState } from 'react';

import { AppButton, AppText, AppTextAreaInput } from '@ohlify/ui';
import type { AdminConfigItem } from '@ohlify/api';

import { PageHeader } from '../../../shared/parts/page-header.js';
import { QueryView } from '../../../shared/parts/empty-or-error.js';
import { SearchInput } from '../../../shared/parts/search-input.js';
import { promptForReason, toastError, toastSuccess } from '../../../shared/lib/confirm.js';
import { useAdminConfig, usePatchConfig } from '../api/use-config.js';
import { ConfigField } from '../parts/config-field.js';
import { ConfigRow, ConfigSection } from '../parts/config-section.js';
import { decodeForInput, encodeFromInput, valuesEqual } from '../lib/config-codec.js';
import {
  CONFIG_GROUPS,
  findKeyDef,
  groupOf,
  humanizeKey,
  type ConfigKeyDef,
} from '../lib/config-registry.js';

/**
 * Internal per-field state. Held in a flat record by key for cheap diffing.
 * Each field carries its draft string, the kind we used to decode/encode
 * it, and any encode error so the field can render red without re-running
 * validation on every keystroke.
 */
interface DraftField {
  raw: string;
  /** null when the key is unknown (raw JSON fallback). */
  def: ConfigKeyDef | null;
  /** Stored JSON value at last fetch; for diff. */
  initial: unknown;
  /** Cached encode error for the current `raw`. */
  error: string | null;
}

export function ConfigScreen() {
  const cfg = useAdminConfig();
  const patch = usePatchConfig();
  const [drafts, setDrafts] = useState<Record<string, DraftField>>({});
  const [search, setSearch] = useState('');

  // Seed/reset drafts whenever the server data changes. Each known key
  // gets decoded into its display form (e.g. kobo → naira). Unknown keys
  // fall through as raw JSON.
  useEffect(() => {
    if (!cfg.data) return;
    const seed: Record<string, DraftField> = {};
    for (const row of cfg.data) {
      const def = findKeyDef(row.key);
      const raw = def ? decodeForInput(def.kind, row.value) : jsonOrString(row.value);
      seed[row.key] = { raw, def, initial: row.value, error: null };
    }
    setDrafts(seed);
  }, [cfg.data]);

  const setRaw = (key: string, raw: string) => {
    setDrafts((prev) => {
      const existing = prev[key];
      if (!existing) return prev;
      let error: string | null = null;
      if (existing.def) {
        const enc = encodeFromInput(existing.def.kind, raw);
        if (!enc.ok) error = enc.error;
      }
      return { ...prev, [key]: { ...existing, raw, error } };
    });
  };

  // ── Diff + save ────────────────────────────────────────────────────────

  const dirtyKeys = useMemo(() => {
    const out: string[] = [];
    for (const [key, draft] of Object.entries(drafts)) {
      const encoded = draft.def
        ? encodeFromInput(draft.def.kind, draft.raw)
        : ({ ok: true, value: tryParseJson(draft.raw) } as const);
      if (!encoded.ok) {
        // Errored fields count as dirty so the operator can see the badge.
        out.push(key);
        continue;
      }
      const equal = draft.def
        ? valuesEqual(draft.def.kind, encoded.value, draft.initial)
        : JSON.stringify(encoded.value) === JSON.stringify(draft.initial);
      if (!equal) out.push(key);
    }
    return out;
  }, [drafts]);

  const erroredKeys = useMemo(
    () => Object.entries(drafts).filter(([, d]) => d.error !== null).map(([k]) => k),
    [drafts],
  );

  const onSave = async () => {
    if (dirtyKeys.length === 0) {
      toastError('Nothing to save');
      return;
    }
    if (erroredKeys.length > 0) {
      toastError(`${erroredKeys.length} field${erroredKeys.length === 1 ? '' : 's'} need fixing`);
      return;
    }
    const note = await promptForReason({
      title: `Save ${dirtyKeys.length} config change${dirtyKeys.length === 1 ? '' : 's'}?`,
      message: 'Required: explain why this change is being made (logged with before/after).',
      placeholder: 'e.g. Lowering platform fee from 15% to 10% per finance review',
    });
    if (!note) return;

    const updates: Array<{ key: string; value: unknown }> = [];
    for (const key of dirtyKeys) {
      const draft = drafts[key]!;
      const encoded = draft.def
        ? encodeFromInput(draft.def.kind, draft.raw)
        : ({ ok: true, value: tryParseJson(draft.raw) } as const);
      if (!encoded.ok) continue; // shouldn't happen — guarded above
      updates.push({ key, value: encoded.value });
    }

    patch.mutate(
      { updates, note },
      {
        onSuccess: () => toastSuccess(`Saved ${updates.length} key(s)`),
        onError: (err) => toastError(err),
      },
    );
  };

  // ── Group + filter ─────────────────────────────────────────────────────

  const grouped = useMemo(() => {
    const out = new Map<string, AdminConfigItem[]>();
    for (const row of cfg.data ?? []) {
      const def = findKeyDef(row.key);
      if (search) {
        const haystack = `${row.key} ${def?.label ?? ''} ${def?.help ?? ''}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) continue;
      }
      const groupId = groupOf(def, row.key);
      if (!out.has(groupId)) out.set(groupId, []);
      out.get(groupId)!.push(row);
    }
    // Sort each group's rows by label for stable rendering.
    for (const rows of out.values()) {
      rows.sort((a, b) => labelFor(a.key).localeCompare(labelFor(b.key)));
    }
    return out;
  }, [cfg.data, search]);

  // Sorted group ids — known groups in CONFIG_GROUPS order, then any extras.
  const orderedGroupIds = useMemo(() => {
    const present = Array.from(grouped.keys());
    return present.sort((a, b) => orderOf(a) - orderOf(b));
  }, [grouped]);

  return (
    <>
      <PageHeader
        title="Platform config"
        subtitle="Runtime knobs. Edits require a note and are audit-logged with before/after."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {erroredKeys.length > 0 && (
              <AppText variant="bodySmall" className="text-red-700">
                {erroredKeys.length} invalid
              </AppText>
            )}
            {dirtyKeys.length > 0 && (
              <AppText variant="bodySmall" className="text-amber-700">
                {dirtyKeys.length} unsaved
              </AppText>
            )}
            <AppButton
              label="Save changes"
              variant="solid"
              height={36}
              isLoading={patch.isPending}
              onPressed={
                dirtyKeys.length > 0 && erroredKeys.length === 0 ? onSave : undefined
              }
            />
          </div>
        }
      />

      <div className="border-b border-border bg-surface px-4 py-3 sm:px-6">
        <div className="max-w-md">
          <SearchInput
            value={search}
            onDebouncedChange={setSearch}
            placeholder="Search keys, labels, help text…"
          />
        </div>
      </div>

      <div className="px-4 py-6 sm:px-6">
        <QueryView isLoading={cfg.isLoading} error={cfg.error}>
          {cfg.data && (
            <div className="flex flex-col gap-4">
              {orderedGroupIds.length === 0 && (
                <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center text-text-muted">
                  No keys match this search.
                </div>
              )}
              {orderedGroupIds.map((groupId) => {
                const rows = grouped.get(groupId) ?? [];
                const dirtyInGroup = rows.filter((r) => dirtyKeys.includes(r.key)).length;
                const groupLabel =
                  CONFIG_GROUPS.find((g) => g.id === groupId)?.label ?? toTitle(groupId);
                return (
                  <ConfigSection key={groupId} title={groupLabel} dirtyCount={dirtyInGroup}>
                    {rows.map((row) => {
                      const draft = drafts[row.key];
                      if (!draft) return null;
                      const def = draft.def;
                      const isDirty = dirtyKeys.includes(row.key);
                      return (
                        <ConfigRow
                          key={row.key}
                          label={def?.label ?? humanizeKey(row.key)}
                          help={def?.help}
                          keyName={row.key}
                          isPublic={row.is_public}
                          isDirty={isDirty}
                        >
                          {def ? (
                            <ConfigField
                              def={def}
                              value={draft.raw}
                              error={draft.error}
                              onChange={(v) => setRaw(row.key, v)}
                            />
                          ) : (
                            // Unknown key — fall back to a small JSON
                            // textarea so anything new the backend seeds
                            // is still editable.
                            <AppTextAreaInput
                              value={draft.raw}
                              onChange={(v) => setRaw(row.key, v)}
                            />
                          )}
                        </ConfigRow>
                      );
                    })}
                  </ConfigSection>
                );
              })}
            </div>
          )}
        </QueryView>
      </div>
    </>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────

function labelFor(key: string): string {
  return findKeyDef(key)?.label ?? humanizeKey(key);
}

function orderOf(groupId: string): number {
  return CONFIG_GROUPS.find((g) => g.id === groupId)?.order ?? 1000;
}

function toTitle(s: string): string {
  return s.replace(/^./, (c) => c.toUpperCase());
}

function jsonOrString(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
