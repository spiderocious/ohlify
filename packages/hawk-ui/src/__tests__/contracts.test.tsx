import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  HAWK_DATA_STATES,
  HawkDataState,
  canActOnBalance,
  errorIsBlocking,
  formatAge,
  hasContent,
} from '../contracts/data-state.js';
import {
  dimsContent,
  errorTextOf,
  isInert,
  showsError,
} from '../contracts/field-state.js';
import { HawkFigure } from '../foundation/figure.js';
import {
  costOfSeconds,
  formatDuration,
  formatKobo,
  formatKoboCompact,
  toKobo,
} from '../foundation/money.js';
import {
  HAWK_LIFECYCLE,
  HAWK_LIFECYCLE_COUNT,
  HAWK_LIFECYCLE_FAMILIES,
  lookupStatus,
} from '../status/lifecycle.js';
import { HawkProvider } from '../theme/register.js';
import {
  HAWK_DANGER,
  HAWK_HAZARD,
  HAWK_QUARTET,
  HAWK_SEMANTICS,
} from '../theme/semantic.js';

/**
 * Contract tests.
 *
 * These check the rules that would otherwise be enforced only by convention —
 * the ones a component could quietly violate without failing to compile. Where
 * a rule is stated in CONTRACTS.md, the section is cited.
 */

describe('the semantic quartet (CONTRACTS §1.1)', () => {
  it('ships all four slots for every semantic', () => {
    for (const semantic of HAWK_SEMANTICS) {
      const tone = HAWK_QUARTET[semantic];
      expect(tone.text, `${semantic}.base`).toBeTruthy();
      expect(tone.softBg, `${semantic}.soft`).toBeTruthy();
      expect(tone.onSoft, `${semantic}.onSoft`).toBeTruthy();
      expect(tone.border, `${semantic}.border`).toBeTruthy();
    }
  });

  it('has exactly five semantics — no component may invent a sixth', () => {
    expect(HAWK_SEMANTICS).toHaveLength(5);
    expect([...HAWK_SEMANTICS].sort()).toEqual([
      'caution',
      'critical',
      'info',
      'neutral',
      'success',
    ]);
  });

  it('never resolves onSoft to base — contrast fails at small sizes', () => {
    for (const semantic of HAWK_SEMANTICS) {
      const tone = HAWK_QUARTET[semantic];
      expect(tone.cssOnSoft).not.toBe(tone.cssBase);
    }
  });

  it('keeps hazard out of the semantic enum (CONTRACTS §0.2)', () => {
    // Hazard must not be reachable as a semantic value: it is a system
    // alarm-state, never a tone a component can be asked to render.
    expect(HAWK_SEMANTICS).not.toContain('hazard' as never);
    expect(HAWK_HAZARD.cssBase).not.toBe(HAWK_QUARTET.critical.cssBase);
  });

  it('keeps danger distinct from hazard — different registers', () => {
    expect(HAWK_DANGER.cssBase).not.toBe(HAWK_HAZARD.cssBase);
  });
});

describe('the disabled / readOnly / error triad (CONTRACTS §2)', () => {
  it('treats the three flags as independent, not one enum', () => {
    const combined = { disabled: true, readOnly: true, error: true };
    expect(isInert(combined)).toBe(true);
    expect(dimsContent(combined)).toBe(true);
  });

  it('does NOT dim a read-only field — it stays legible', () => {
    // The whole point of the triad. The pre-Hawk app faked readOnly with
    // disabled, muting information the user needed to read.
    expect(dimsContent({ readOnly: true })).toBe(false);
    expect(isInert({ readOnly: true })).toBe(true);
  });

  it('supports readOnly + error — a KYC field under review that failed', () => {
    const state = { readOnly: true, error: true, errorText: 'Name mismatch' };
    expect(isInert(state)).toBe(true);
    expect(dimsContent(state)).toBe(false);
    expect(showsError(state)).toBe(true);
    expect(errorTextOf(state)).toBe('Name mismatch');
  });

  it('suppresses the error display when disabled, keeping the flag', () => {
    const state = { disabled: true, error: true, errorText: 'Required' };
    expect(showsError(state)).toBe(false);
    expect(errorTextOf(state)).toBeUndefined();
    // The flag itself survives for whatever re-enables the field.
    expect(state.error).toBe(true);
  });

  it('is enabled and valid by default', () => {
    expect(isInert({})).toBe(false);
    expect(dimsContent({})).toBe(false);
    expect(showsError({})).toBe(false);
  });
});

describe('the freshness contract (CONTRACTS §10)', () => {
  it('carries all four data states', () => {
    expect(HAWK_DATA_STATES).toHaveLength(4);
    expect([...HAWK_DATA_STATES].sort()).toEqual(['empty', 'fresh', 'loading', 'stale']);
  });

  it('treats stale as content, not an error', () => {
    expect(hasContent(HawkDataState.STALE)).toBe(true);
    expect(errorIsBlocking(HawkDataState.STALE)).toBe(false);
  });

  it('blocks with a full error only on a cold cache', () => {
    expect(errorIsBlocking(HawkDataState.LOADING)).toBe(true);
    expect(errorIsBlocking(HawkDataState.EMPTY)).toBe(true);
    expect(errorIsBlocking(HawkDataState.FRESH)).toBe(false);
  });

  it('refuses to act on a stale balance — browse offline, do not spend', () => {
    expect(canActOnBalance(HawkDataState.FRESH)).toBe(true);
    expect(canActOnBalance(HawkDataState.STALE)).toBe(false);
    expect(canActOnBalance(HawkDataState.LOADING)).toBe(false);
  });

  it('formats age coarsely enough not to invite false confidence', () => {
    expect(formatAge(5_000)).toBe('just now');
    expect(formatAge(4 * 60_000)).toBe('4 min ago');
    expect(formatAge(60 * 60_000)).toBe('1 hour ago');
    expect(formatAge(25 * 60 * 60_000)).toBe('yesterday');
  });
});

describe('money is kobo-safe', () => {
  it('accepts both wire shapes — number and string', () => {
    expect(toKobo(150_000)).toBe(150_000);
    expect(toKobo('150000')).toBe(150_000);
    expect(toKobo(null)).toBe(0);
    expect(toKobo(undefined)).toBe(0);
    expect(toKobo('not a number')).toBe(0);
  });

  it('never introduces a float', () => {
    // 0.1 + 0.2 problems are a curiosity elsewhere and a ledger discrepancy
    // here, so every value stays an integer count of minor units.
    expect(Number.isInteger(toKobo('842000'))).toBe(true);
    expect(Number.isInteger(costOfSeconds(4167, 137))).toBe(true);
  });

  it('formats naira from kobo', () => {
    expect(formatKobo(842_000)).toBe('₦8,420');
    expect(formatKobo(842_050, { decimals: true })).toBe('₦8,420.50');
    expect(formatKobo(-250_000)).toBe('-₦2,500');
    expect(formatKobo(250_000, { signed: true })).toBe('+₦2,500');
    expect(formatKobo(250_000, { symbol: false })).toBe('2,500');
  });

  it('compacts only for dense surfaces', () => {
    expect(formatKoboCompact(842_000)).toBe('₦8.4k');
    expect(formatKoboCompact(150_000_000)).toBe('₦1.5m');
  });

  it('pads durations so the width never changes mid-call', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(64)).toBe('01:04');
    expect(formatDuration(3_725)).toBe('1:02:05');
    // A negative elapsed time is a clock-skew bug, not something to render.
    expect(formatDuration(-5)).toBe('00:00');
  });
});

describe('the masking contract (CONTRACTS §9)', () => {
  it('hides the amount when masking is on', () => {
    render(
      <HawkProvider masked>
        <HawkFigure value={842_000} />
      </HawkProvider>,
    );
    expect(screen.getByLabelText('Amount hidden')).toBeDefined();
    expect(screen.queryByTitle('₦8,420')).toBeNull();
  });

  it('keeps the real string in the DOM to pin the width', () => {
    // The layout must not shift when masking toggles, so the unmasked text is
    // still rendered — invisible and aria-hidden — to hold the box open.
    const { container } = render(
      <HawkProvider masked>
        <HawkFigure value={842_000} />
      </HawkProvider>,
    );
    const ghost = container.querySelector('.invisible');
    expect(ghost).not.toBeNull();
    expect(ghost?.textContent).toBe('₦8,420');
  });

  it('leaves a public rate unmasked — masking hides your money, not a price', () => {
    render(
      <HawkProvider masked>
        <HawkFigure value={250_000} neverMasked />
      </HawkProvider>,
    );
    expect(screen.getByTitle('₦2,500')).toBeDefined();
  });

  it('is read from context, never a prop', () => {
    render(
      <HawkProvider masked={false}>
        <HawkFigure value={842_000} />
      </HawkProvider>,
    );
    expect(screen.getByTitle('₦8,420')).toBeDefined();
  });
});

describe('the lifecycle registry', () => {
  it('carries every named state the spec asked for', () => {
    // The spec asked for 63+; the registry names 74 across 16 families.
    expect(HAWK_LIFECYCLE_COUNT).toBeGreaterThanOrEqual(63);
    expect(HAWK_LIFECYCLE_FAMILIES.length).toBe(16);
  });

  it('gives every state a human label, never a raw enum value', () => {
    for (const family of HAWK_LIFECYCLE_FAMILIES) {
      for (const status of HAWK_LIFECYCLE[family]) {
        expect(status.label.length, `${family}.${status.key}`).toBeGreaterThan(0);
        // A label containing an underscore is a leaked database value.
        expect(status.label, `${family}.${status.key}`).not.toMatch(/_/);
      }
    }
  });

  it('gives every state one of the five semantics', () => {
    for (const family of HAWK_LIFECYCLE_FAMILIES) {
      for (const status of HAWK_LIFECYCLE[family]) {
        expect(HAWK_SEMANTICS, `${family}.${status.key}`).toContain(status.semantic);
      }
    }
  });

  it('keeps keys unique within a family', () => {
    for (const family of HAWK_LIFECYCLE_FAMILIES) {
      const keys = HAWK_LIFECYCLE[family].map((status) => status.key);
      expect(new Set(keys).size, family).toBe(keys.length);
    }
  });

  it('returns undefined for an unknown key rather than inventing a fallback', () => {
    // A key the registry does not know means the backend gained a state the UI
    // has not been taught. Swallowing that into a grey "Unknown" pill is how it
    // goes unnoticed for a release.
    expect(lookupStatus('call', 'teleported')).toBeUndefined();
    expect(lookupStatus('call', 'completed')?.label).toBe('Completed');
  });

  it('preserves the deliberately counter-intuitive tones', () => {
    // A completed call is neutral, not success: finishing a call is the normal
    // case, and a green badge on every row makes the exceptional ones invisible.
    expect(lookupStatus('call', 'completed')?.semantic).toBe('neutral');
    // Refunded is info, not success — money coming back usually ends something
    // that went wrong.
    expect(lookupStatus('refund', 'refunded')?.semantic).toBe('info');
    // An active strike tracks the user's exposure.
    expect(lookupStatus('strike', 'active')?.semantic).toBe('critical');
    expect(lookupStatus('strike', 'voided')?.semantic).toBe('neutral');
  });
});
