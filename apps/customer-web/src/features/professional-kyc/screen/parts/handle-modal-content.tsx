import { useEffect, useState } from 'react';

import { AppButton, AppText, AppTextInput } from '@ohlify/ui';
import type { HandleCheckResponse } from '@ohlify/api';

import { useCheckHandle } from '../../api/use-check-handle.js';

interface HandleModalContentProps {
  /** Current saved handle, if any — pre-fills the input. */
  initial?: string | null;
  /** Subtitle shown above the field. */
  subtitle?: string;
  /**
   * Called with the validated lowercase handle when the user taps Save. Must
   * return a Promise that resolves once the save has actually landed; the
   * modal stays open with a loader until then. Throw to keep the modal open
   * with the inputs re-enabled.
   */
  onSubmit: (handle: string) => Promise<void>;
  /** Invoked once the save resolves so the host can dismiss the modal. */
  onSuccess?: () => void;
}

const DEBOUNCE_MS = 350;

/**
 * Tiny inline debounce — returns a value that lags `value` by `delay` ms.
 * Pulled out instead of imported because there's no shared hook in the repo
 * yet and this is the only consumer.
 */
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const REASON_TEXT: Record<Exclude<HandleCheckResponse, { available: true }>['reason'], string> = {
  taken: 'That username is already taken.',
  invalid_format: 'Use 3–24 lowercase letters, digits, or underscores.',
  reserved: 'That username is reserved by ohlify.',
};

export function HandleModalContent({
  initial,
  subtitle = 'Pick a unique username clients will use to find you. Lowercase letters, digits, and underscores only.',
  onSubmit,
  onSuccess,
}: HandleModalContentProps) {
  const [raw, setRaw] = useState(initial ?? '');
  const [isSaving, setIsSaving] = useState(false);

  // Lowercase + strip whitespace so the debounced value matches what the
  // server normalizes to. Keeps the UX in lockstep with `available: true,
  // normalized: ...` semantics.
  const normalized = raw.trim().toLowerCase();
  const debounced = useDebouncedValue(normalized, DEBOUNCE_MS);

  const isUnchanged = initial !== null && initial !== undefined && debounced === initial.toLowerCase();
  // Don't bother the server for the user's current handle — it'd come back as
  // taken (by themselves) which is misleading. Treat it as available no-op.
  const query = useCheckHandle(isUnchanged ? '' : debounced);

  // Treat a still-typing state (raw differs from debounced) as "checking" so
  // the UI doesn't briefly say "available" between keystrokes.
  const stillTyping = normalized !== debounced;
  const isChecking = !isUnchanged && (stillTyping || query.isFetching);

  const result = query.data;
  const isAvailable = isUnchanged || (result?.available === true);
  const unavailable = result && result.available === false ? result : null;

  const canSubmit =
    !isSaving &&
    !isChecking &&
    !isUnchanged &&
    debounced.length > 0 &&
    isAvailable;

  const handleSave = async () => {
    if (!canSubmit) return;
    setIsSaving(true);
    try {
      await onSubmit(debounced);
      onSuccess?.();
    } catch {
      setIsSaving(false);
    }
  };

  const showSuccessHint = !isChecking && isAvailable && debounced.length > 0;
  const showSuggestions = unavailable !== null && unavailable.suggestions.length > 0;

  // Compose the inline label/error state.
  let helperLine: string | null = null;
  let helperKind: 'success' | 'error' | 'muted' = 'muted';
  if (isChecking) {
    helperLine = 'Checking availability…';
    helperKind = 'muted';
  } else if (isUnchanged) {
    helperLine = `@${debounced} is your current username.`;
    helperKind = 'muted';
  } else if (showSuccessHint && result?.available) {
    helperLine = `@${result.normalized} is available.`;
    helperKind = 'success';
  } else if (unavailable) {
    helperLine = REASON_TEXT[unavailable.reason];
    helperKind = 'error';
  }

  return (
    <div className="space-y-4">
      <AppText variant="body" align="start" color="var(--ohl-text-muted)">
        {subtitle}
      </AppText>

      <div>
        <AppTextInput
          label="Username"
          placeholder="e.g. feranmi"
          value={raw}
          onChange={setRaw}
          disabled={isSaving}
          maxLength={24}
          // Surface taken/reserved/format errors as the input's own error
          // message so it shares the bordered red treatment users already know.
          errorMessage={helperKind === 'error' ? helperLine ?? undefined : undefined}
        />
        {helperLine && helperKind !== 'error' ? (
          <p
            className={
              helperKind === 'success'
                ? 'mt-1.5 text-xs font-medium text-success'
                : 'mt-1.5 text-xs text-text-muted'
            }
          >
            {helperLine}
          </p>
        ) : null}
      </div>

      {showSuggestions ? (
        <div>
          <AppText variant="body" weight={600} align="start" color="var(--ohl-text-jet)">
            Try one of these
          </AppText>
          <div className="mt-2 flex flex-wrap gap-2">
            {unavailable!.suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setRaw(s)}
                disabled={isSaving}
                className="rounded-pill border border-border bg-background px-3 py-1.5 text-sm font-semibold text-text-primary transition hover:border-primary hover:text-primary disabled:opacity-50"
              >
                @{s}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <AppButton
        label={isSaving ? 'Saving…' : 'Save'}
        expanded
        radius={100}
        isDisabled={!canSubmit}
        isLoading={isSaving}
        onPressed={handleSave}
      />
    </div>
  );
}
