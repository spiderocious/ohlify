import { useEffect, useMemo, useState } from 'react';

import { AppTextAreaInput, DrawerService } from '@ohlify/ui';
import type { AdminConfigItem } from '@ohlify/api';
import {
  HawkAdminPageHeader,
  HawkButton,
  HawkCaption,
  HawkEmptyState,
  HawkSearchInput,
} from '@ohlify/hawk-ui';

import { RowsSkeleton } from '../../../shared/parts/board-skeletons.js';
import { toastError, toastSuccess } from '../../../shared/lib/confirm.js';
import { useAdminConfig, usePatchConfig } from '../api/use-config.js';
import { ConfigField } from '../parts/config-field.js';
import { ConfigRow, ConfigSection } from '../parts/config-section.js';
import { ConfigSaveDiffModal, type ConfigDiffEntry } from '../parts/config-save-diff-modal.js';
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
    () =>
      Object.entries(drafts)
        .filter(([, d]) => d.error !== null)
        .map(([k]) => k),
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

    const diffEntries: ConfigDiffEntry[] = dirtyKeys.map((key) => {
      const draft = drafts[key]!;
      const label = draft.def?.label ?? humanizeKey(key);
      const before = draft.def
        ? decodeForInput(draft.def.kind, draft.initial)
        : jsonOrString(draft.initial);
      return { key, label, before, after: draft.raw };
    });

    const note = await new Promise<string | null>((resolve) => {
      const handle = DrawerService.showCustomModal(
        `Save ${dirtyKeys.length} config change${dirtyKeys.length === 1 ? '' : 's'}?`,
        (onDismiss) => (
          <ConfigSaveDiffModal
            entries={diffEntries}
            onSubmit={(value) => {
              resolve(value);
              onDismiss();
            }}
            onCancel={() => {
              resolve(null);
              onDismiss();
            }}
          />
        ),
      );
      void handle;
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
      <HawkAdminPageHeader
        title="Platform config"
        subtitle="Runtime knobs. Every edit takes a note and is audit-logged with before and after."
        actions={
          <div className="flex flex-wrap items-center gap-hawk-4">
            {/*
              Invalid beats unsaved: a key that will not parse blocks the save
              entirely, so it is the state worth reading first.
            */}
            {erroredKeys.length > 0 && (
              <HawkCaption className="text-hawk-critical">
                {erroredKeys.length} invalid
              </HawkCaption>
            )}
            {dirtyKeys.length > 0 && (
              <HawkCaption className="text-hawk-caution">
                {dirtyKeys.length} unsaved
              </HawkCaption>
            )}
            <HawkButton
              label="Save changes"
              loading={patch.isPending}
              disabled={dirtyKeys.length === 0 || erroredKeys.length > 0}
              onClick={() => {
                if (dirtyKeys.length > 0 && erroredKeys.length === 0) void onSave();
              }}
            />
          </div>
        }
      />

      <div className="flex flex-col gap-hawk-6 px-hawk-pad pb-hawk-9">
        <div className="max-w-md">
          <HawkSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search keys, labels, help text…"
          />
        </div>

        {cfg.isLoading ? (
          <RowsSkeleton rows={10} />
        ) : (
          cfg.data && (
            <div className="flex flex-col gap-hawk-6">
              {orderedGroupIds.length === 0 && (
                <HawkEmptyState
                  title="No keys match"
                  description="Try a different search term."
                />
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
          )
        )}
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
