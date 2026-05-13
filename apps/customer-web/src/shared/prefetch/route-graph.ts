import type { QueryClient } from '@tanstack/react-query';

import * as t from './tasks.js';

export interface PrefetchContext {
  qc: QueryClient;
  /** Path params extracted by the watcher's pattern match (e.g. `{ id }`). */
  params: Record<string, string>;
}

export interface PrefetchPlan {
  /** JS-chunk thunks. Cheap idempotent calls; OK to list several. */
  chunks?: Array<() => Promise<unknown>>;
  /** Data-warming tasks. `when` returning false skips the task. */
  data?: Array<{
    /** Stable label — surfaces in devtools if we ever inspect prefetch logs. */
    key: string;
    when?: (ctx: PrefetchContext) => boolean;
    run: (ctx: PrefetchContext) => Promise<unknown>;
  }>;
}

/**
 * Adjacency map: "given the user is *here*, fetch what they'll likely click
 * next." Patterns are matched longest-first; `:id` segments are extracted
 * into `ctx.params`.
 *
 * The map is intentionally small. Profile sub-screens, auth flows, and
 * call-session are excluded — they're either rare, mutation-only, or
 * reached intentionally enough that prefetch is wasted bandwidth.
 */
export const ROUTE_GRAPH: Record<string, PrefetchPlan> = {
  // ── Tier 1 ────────────────────────────────────────────────────────────────
  '/home': {
    chunks: [t.chunkCalls, t.chunkProfessionalSearch, t.chunkProfessionalDetails],
    data: [
      { key: 'call-history', run: ({ qc }) => t.prefetchCallHistory(qc) },
      { key: 'professionals', run: ({ qc }) => t.prefetchProfessionals(qc) },
    ],
  },
  '/calls': {
    chunks: [t.chunkCallDetails, t.chunkScheduleCall],
    // Call detail prefetches happen via hover on individual cards — we
    // don't know which one the user wants without the click signal.
  },
  '/professional/:id': {
    chunks: [t.chunkScheduleCall],
    // Pro detail + rates are already cached by the current page render; no
    // additional data tasks needed here.
  },

  // ── Tier 2 ────────────────────────────────────────────────────────────────
  '/professionals': {
    chunks: [t.chunkProfessionalDetails, t.chunkScheduleCall],
    // Search results are id-driven; per-card hover handles the data side.
  },
  '/call/:id': {
    chunks: [t.chunkScheduleCall, t.chunkProfessionalDetails],
    // No proactive data prefetch — destination depends on user action
    // (reschedule, join, view profile). Hover handles those.
  },
  '/wallet': {
    chunks: [t.chunkHome],
    // Wallet has no forward routes — modal-driven funding/withdraw. Chunk
    // for Home covers the common back-to-tab path.
  },
};

/**
 * Walks `ROUTE_GRAPH` keys looking for the first pattern that matches
 * `pathname`. Returns the matched plan + extracted params, or null.
 *
 * Pattern syntax: `:name` matches a single path segment. We deliberately
 * don't support wildcards — the graph is small enough to enumerate.
 */
export function lookupPlan(
  pathname: string,
): { plan: PrefetchPlan; params: Record<string, string> } | null {
  for (const [pattern, plan] of Object.entries(ROUTE_GRAPH)) {
    const params = matchPattern(pattern, pathname);
    if (params) return { plan, params };
  }
  return null;
}

function matchPattern(pattern: string, pathname: string): Record<string, string> | null {
  const a = pattern.split('/').filter(Boolean);
  const b = pathname.split('/').filter(Boolean);
  if (a.length !== b.length) return null;
  const out: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    const ap = a[i]!;
    const bp = b[i]!;
    if (ap.startsWith(':')) {
      out[ap.slice(1)] = bp;
    } else if (ap !== bp) {
      return null;
    }
  }
  return out;
}
