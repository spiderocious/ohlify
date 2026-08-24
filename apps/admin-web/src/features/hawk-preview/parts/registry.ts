import type { ComponentType } from 'react';

/**
 * The gallery registry.
 *
 * `hawk-pages.generated.ts` is written by `tools/hawk-pages.mjs`, which walks
 * the page files and reads the `@HawkPage` docblock each one declares. A
 * component that exists but is not in the gallery is a component nobody
 * reviews — the design system's own `repatch.py` exists for the same reason,
 * and the Flutter port's `tool/hawk_pages.py` is the direct counterpart.
 */
export interface HawkPageEntry {
  /** Matches the design system's specimen slug — `20-button`, `A03-data-table`. */
  slug: string;
  name: string;
  group: string;
  /** State names the page anchors, for the index's state filter. */
  states: readonly string[];
  component: ComponentType;
}

/** Group order in the index. Foundation first, admin last — as `nav.json` has it. */
export const HAWK_GROUPS = [
  'Foundation',
  'Actions',
  'Inputs',
  'Status & lifecycle',
  'Data display',
  'Rows',
  'Structure',
  'Feedback & overlays',
  'Modals',
  'Calls & live',
  'Navigation',
  'Money',
  'Trust',
  'Board',
  'Scenes — consumer',
  'Scenes — admin',
] as const;

export type HawkGroup = (typeof HAWK_GROUPS)[number];
