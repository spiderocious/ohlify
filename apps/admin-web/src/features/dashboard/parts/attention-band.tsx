import { Link } from 'react-router-dom';

import {
  HawkCaption,
  HawkIcon,
  HawkSemantic,
  HawkText,
  IconCheck,
  cn,
  quartet,
} from '@ohlify/hawk-ui';

import { AttentionSkeleton } from '../../../shared/parts/board-skeletons.js';
import { AttentionTone, type AttentionSignal } from './dashboard-adapters.js';

/**
 * The triage band — what needs a human right now.
 *
 * First on the page, above revenue, and that ordering is the whole argument of
 * this dashboard: an operator opening it at 9am needs "is anything broken?"
 * before "how did we do?". Revenue is never urgent; an unprocessed funding
 * webhook is.
 *
 * Two deliberate behaviours:
 *
 * **Zero-count signals are dropped, not greyed.** A row of zeroes trains
 * people to skim past the band, which defeats it. When everything is clear the
 * whole band collapses to one quiet line.
 *
 * **It ignores the date filter.** Every other section responds to the range
 * control; this one does not. "12 KYC pending" is a now-fact — scoping it to
 * the last 7 days would hide the submission stuck for three weeks, which is
 * exactly the one worth seeing. The heading says so.
 */
export function AttentionBand({
  signals,
  isLoading,
}: {
  signals: readonly AttentionSignal[];
  isLoading: boolean;
}) {
  return (
    <section aria-label="Needs attention" className="flex flex-col gap-hawk-4">
      {/* The heading renders in every state, so the page does not shift when
          data lands and the section keeps its accessible name while loading. */}
      <div className="flex items-baseline gap-hawk-4">
        <HawkText variant="label" ink="strong" className="font-semibold">
          Needs attention
        </HawkText>
        <HawkCaption ink="muted">Live — not affected by the date filter</HawkCaption>
      </div>

      {isLoading ? (
        <AttentionSkeleton />
      ) : signals.length === 0 ? (
        // The adapter already drops zero-count signals, so an empty list
        // genuinely means nothing is wrong.
        <AllClear />
      ) : (
        <div className="grid gap-hawk-4 sm:grid-cols-2 xl:grid-cols-3">
          {signals.map((signal) => (
            <AttentionCard key={signal.key} signal={signal} />
          ))}
        </div>
      )}
    </section>
  );
}

function AttentionCard({ signal }: { signal: AttentionSignal }) {
  const tone = quartet(
    signal.tone === AttentionTone.CRITICAL ? HawkSemantic.CRITICAL : HawkSemantic.CAUTION,
  );

  return (
    <Link
      to={signal.to}
      className={cn(
        'hawk-focusable hawk-motion group flex items-start gap-hawk-5 rounded-hawk border p-hawk-pad',
        'transition-colors duration-hawk-fast ease-hawk-standard',
        tone.softBg,
        tone.border,
      )}
    >
      {/* Solid fill for the glyph chip: the card is already on the soft
          ground, so a soft-on-soft chip would disappear into it. */}
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-hawk-sm',
          tone.solidBg,
        )}
      >
        <HawkIcon icon={signal.icon} size={16} className="text-hawk-ink-inverse" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-hawk-1">
        <div className="flex items-baseline gap-hawk-3">
          {/* The count leads; the age is the qualifier that makes it urgent. */}
          <HawkText variant="medium" record className={cn('font-semibold', tone.onSoft)}>
            {signal.count}
          </HawkText>
          <HawkText variant="label" className={cn('font-medium', tone.onSoft)}>
            {signal.label}
          </HawkText>
        </div>

        {signal.age && (
          <HawkText variant="caption" record className={tone.text}>
            {signal.age}
          </HawkText>
        )}

        <HawkCaption ink="muted" className="leading-snug">
          {signal.hint}
        </HawkCaption>
      </div>
    </Link>
  );
}

function AllClear() {
  const tone = quartet(HawkSemantic.SUCCESS);
  return (
    <div
      className={cn(
        'flex items-center gap-hawk-4 rounded-hawk border px-hawk-pad py-hawk-5',
        tone.softBg,
        tone.border,
      )}
    >
      <HawkIcon icon={IconCheck} size={16} className={tone.text} />
      <HawkText variant="label" className={cn('font-semibold', tone.onSoft)}>
        All clear
      </HawkText>
      <HawkCaption ink="muted">No stuck queues, unprocessed webhooks or ledger drift.</HawkCaption>
    </div>
  );
}
