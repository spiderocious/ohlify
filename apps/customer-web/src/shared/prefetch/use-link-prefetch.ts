import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import { PREFETCH_ENABLED } from './config.js';
import { canPrefetch } from './guards.js';
import * as t from './tasks.js';

/**
 * Hover/focus-triggered prefetch. Returns `{ onMouseEnter, onFocus }`
 * handlers that the caller spreads onto a tappable element. Internally
 * deduped — the same element re-firing `mouseenter` won't re-prefetch.
 *
 * Each helper here is keyed to a list-tile use case:
 *   - `professionalTile(id)` — primes pro detail, rates, schedule-call chunk.
 *   - `callHistoryTile(id)`  — primes the call detail row.
 *
 * If you need a new variant, add a factory alongside these — keep the
 * "what gets prefetched" tied to the *kind* of link, not the destination,
 * so the call site reads `usePrefetchProfessional(id)` rather than a list
 * of raw tasks.
 *
 * No-op when `VITE_ENABLE_PREFETCH !== '1'`.
 */

interface PrefetchHandlers {
  onMouseEnter: () => void;
  onFocus: () => void;
}

const NOOP_HANDLERS: PrefetchHandlers = {
  onMouseEnter: () => undefined,
  onFocus: () => undefined,
};

function useHoverDeduped(run: () => void): PrefetchHandlers {
  const fired = useRef(false);
  const onTrigger = useCallback(() => {
    if (fired.current) return;
    fired.current = true;
    if (!canPrefetch()) {
      // Allow retry on a later hover when conditions improve.
      fired.current = false;
      return;
    }
    run();
  }, [run]);
  return { onMouseEnter: onTrigger, onFocus: onTrigger };
}

export function usePrefetchProfessional(id: string): PrefetchHandlers {
  const qc = useQueryClient();
  const run = useCallback(() => {
    if (!id) return;
    void t.prefetchProfessional(qc, id);
    void t.prefetchProfessionalRates(qc, id);
    void t.prefetchProfessionalReviews(qc, id);
    void t.chunkProfessionalDetails().catch(() => undefined);
    void t.chunkScheduleCall().catch(() => undefined);
  }, [qc, id]);
  const handlers = useHoverDeduped(run);
  return PREFETCH_ENABLED ? handlers : NOOP_HANDLERS;
}

export function usePrefetchCallHistoryItem(id: string): PrefetchHandlers {
  const qc = useQueryClient();
  const run = useCallback(() => {
    if (!id) return;
    void t.prefetchCallHistoryItem(qc, id);
    void t.chunkCallDetails().catch(() => undefined);
  }, [qc, id]);
  const handlers = useHoverDeduped(run);
  return PREFETCH_ENABLED ? handlers : NOOP_HANDLERS;
}
