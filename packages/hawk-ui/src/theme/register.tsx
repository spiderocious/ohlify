import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { cn } from '../utils/cn.js';

/**
 * The law, made mechanical. CONTRACTS §0.
 *
 * > Two zones. Every surface is a PASS or a BOARD.
 *
 * **PASS** — what one person holds. Card stock, fierce hierarchy, one enormous
 * value. Radii `md`/`lg`. Surfaces carry structure.
 *
 * **BOARD** — what an operator scans. Columnar, hairline-ruled, tabular, many
 * rows at one weight. Radii `sm`/`xs`. Rules carry structure.
 *
 * A screen may hold both; a single block belongs to exactly one.
 */
export const HawkRegister = {
  PASS: 'pass',
  BOARD: 'board',
} as const;
export type HawkRegister = (typeof HawkRegister)[keyof typeof HawkRegister];

const RegisterContext = createContext<HawkRegister>(HawkRegister.PASS);

/** The register the calling component sits in. */
export function useHawkRegister(): HawkRegister {
  return useContext(RegisterContext);
}

export interface HawkRegisterScopeProps {
  value: HawkRegister;
  children: ReactNode;
  className?: string;
  /** Element to render. Defaults to `div`. */
  as?: 'div' | 'section' | 'article' | 'aside' | 'main';
}

/**
 * Opens a register zone.
 *
 * This does two things at once, and both are needed. It sets the React context
 * — so a component can branch on register in TypeScript — and it stamps the
 * `.hawk-pass` / `.hawk-board` class, which is what actually redefines
 * `--hawk-rad`, `--hawk-h-md`, `--hawk-pad` and `--hawk-gap` for the subtree.
 *
 * The CSS half is the load-bearing one: a plain `<div className="hawk-board">`
 * placed by feature code resolves correctly even with no React context, which
 * matters because the spec's own specimens do exactly that.
 */
export function HawkRegisterScope({
  value,
  children,
  className,
  as: Tag = 'div',
}: HawkRegisterScopeProps) {
  return (
    <RegisterContext.Provider value={value}>
      <Tag className={cn(value === 'board' ? 'hawk-board' : 'hawk-pass', className)}>
        {children}
      </Tag>
    </RegisterContext.Provider>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkAmbient {
  /**
   * Global amount masking. CONTRACTS §9.
   *
   * One preference hides **every** monetary figure app-wide, including the
   * live in-call earnings counter. Money-bearing components read this from
   * context and never take it as a prop — a masking preference that some
   * components honour and others do not is not a preference.
   */
  readonly masked: boolean;
  /**
   * Honour reduced motion regardless of the OS setting.
   *
   * The OS preference is respected independently via `prefers-reduced-motion`
   * in the stylesheet; this flag is the in-app override, which is what lets the
   * gallery demonstrate the reduced-motion rendering without asking a reviewer
   * to change their system settings.
   */
  readonly reducedMotion: boolean;
}

const AmbientContext = createContext<HawkAmbient>({
  masked: false,
  reducedMotion: false,
});

export function useHawkAmbient(): HawkAmbient {
  return useContext(AmbientContext);
}

/** Whether monetary figures should render masked. Read from context, never a prop. */
export function useHawkMasked(): boolean {
  return useContext(AmbientContext).masked;
}

export function useHawkReducedMotion(): boolean {
  return useContext(AmbientContext).reducedMotion;
}

export interface HawkProviderProps {
  children: ReactNode;
  masked?: boolean;
  reducedMotion?: boolean;
  /** The register this tree opens in. Defaults to PASS. */
  register?: HawkRegister;
  className?: string;
}

/**
 * The root of any Hawk tree.
 *
 * Sets the ambient contract — masking and reduced motion — and opens the
 * outermost register zone. Everything Hawk renders should sit under one of
 * these; a component outside it still resolves (the stylesheet declares the
 * PASS register on `:root` as a fallback) but reads `masked: false`.
 */
export function HawkProvider({
  children,
  masked = false,
  reducedMotion = false,
  register = HawkRegister.PASS,
  className,
}: HawkProviderProps) {
  const ambient = useMemo<HawkAmbient>(
    () => ({ masked, reducedMotion }),
    [masked, reducedMotion],
  );

  return (
    <AmbientContext.Provider value={ambient}>
      <RegisterContext.Provider value={register}>
        <div
          // Read by the stylesheet's `[data-hawk-reduced-motion]` rules, which
          // is how the in-app toggle reaches CSS animations that no React code
          // touches (the shimmer, the call pulses).
          data-hawk-reduced-motion={reducedMotion ? 'true' : 'false'}
          className={cn(
            'font-hawk text-hawk-body text-hawk-ink',
            register === 'board' ? 'hawk-board' : 'hawk-pass',
            className,
          )}
        >
          {children}
        </div>
      </RegisterContext.Provider>
    </AmbientContext.Provider>
  );
}
