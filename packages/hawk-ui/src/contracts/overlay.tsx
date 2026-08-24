import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { cn } from '../utils/cn.js';

/**
 * The overlay contract. CONTRACTS §4.
 *
 * Every overlay — modal, drawer, bottom sheet, side sheet, popover, menu,
 * tooltip, takeover — shares five parts:
 *
 *     open / defaultOpen · onOpenChange · Trigger · Portal · Content
 *
 * Surfaces differ **only** in anchor and viewport coverage. Never in how
 * open/close works. The pre-Hawk app had 13 overlay surfaces with no shared
 * contract, each managing its own visibility.
 *
 * Scrim/content timing is part of the contract, not a per-surface choice:
 * scrim `0 → 0.5` over 200ms; content `scale .96 → 1` + `opacity 0 → 1` over
 * 280ms `easeOutCubic`, **trailing the scrim by 40ms**.
 */
export const HawkOverlaySurface = {
  MODAL: 'modal',
  BOTTOM_SHEET: 'bottom-sheet',
  SIDE_SHEET: 'side-sheet',
  TAKEOVER: 'takeover',
  POPOVER: 'popover',
} as const;
export type HawkOverlaySurface =
  (typeof HawkOverlaySurface)[keyof typeof HawkOverlaySurface];

export interface HawkOverlayControl {
  readonly open: boolean;
  readonly setOpen: (open: boolean) => void;
  readonly close: () => void;
}

/**
 * The one open/close mechanism.
 *
 * Controlled when `open` is supplied, uncontrolled otherwise — the standard
 * React pattern, so a caller can hand over control without the component
 * needing a second code path.
 */
export function useHawkOverlay(
  open?: boolean,
  onOpenChange?: (open: boolean) => void,
  defaultOpen = false,
): HawkOverlayControl {
  const [uncontrolled, setUncontrolled] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const value = isControlled ? open : uncontrolled;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolled(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  const close = useCallback(() => setOpen(false), [setOpen]);

  return useMemo(
    () => ({ open: value, setOpen, close }),
    [value, setOpen, close],
  );
}

/* ── Scroll locking ───────────────────────────────────────────────────────
   Reference-counted, because two stacked overlays must not have the inner one
   restore scroll on close while the outer is still open. */
let scrollLocks = 0;
let restoreOverflow = '';

function lockScroll(): () => void {
  if (typeof document === 'undefined') return () => undefined;
  if (scrollLocks === 0) {
    restoreOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  scrollLocks += 1;
  return () => {
    scrollLocks -= 1;
    if (scrollLocks === 0) document.body.style.overflow = restoreOverflow;
  };
}

/* ── Escape handling ──────────────────────────────────────────────────────
   Only the topmost dismissible overlay reacts, so Escape closes one layer at a
   time rather than collapsing a whole stack at once. */
const escapeStack: Array<() => void> = [];

function pushEscape(handler: () => void): () => void {
  escapeStack.push(handler);
  return () => {
    const i = escapeStack.indexOf(handler);
    if (i >= 0) escapeStack.splice(i, 1);
  };
}

if (typeof document !== 'undefined') {
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const top = escapeStack[escapeStack.length - 1];
    if (top) top();
  });
}

/* ────────────────────────────────────────────────────────────────────────── */

const OverlayContext = createContext<HawkOverlayControl | null>(null);

/** The enclosing overlay, for content that needs to dismiss itself. */
export function useHawkOverlayContext(): HawkOverlayControl | null {
  return useContext(OverlayContext);
}

export interface HawkOverlayProps {
  open: boolean;
  onClose: () => void;
  surface?: HawkOverlaySurface;
  children: ReactNode;
  /** Whether a scrim click or Escape dismisses. Defaults to true. */
  dismissible?: boolean;
  /** Portal target. Defaults to `document.body`. */
  container?: HTMLElement | null;
  /** Accessible label for the dialog. */
  label?: string;
  className?: string;
  /** Class applied to the positioning frame, for width overrides. */
  frameClassName?: string;
  /** Rendered above everything — used by the critical/irreversible register. */
  elevated?: boolean;
}

const SURFACE_FRAME: Record<HawkOverlaySurface, string> = {
  modal: 'items-center justify-center p-hawk-6',
  'bottom-sheet': 'items-end justify-center',
  'side-sheet': 'items-stretch justify-end',
  takeover: 'items-stretch justify-stretch',
  popover: 'items-start justify-center p-hawk-6',
};

const SURFACE_PANEL: Record<HawkOverlaySurface, string> = {
  modal:
    'w-full max-w-lg rounded-hawk-fixed-lg bg-hawk-paper shadow-hawk-modal animate-hawk-content-in',
  'bottom-sheet':
    'w-full max-w-2xl rounded-t-hawk-fixed-xl bg-hawk-paper shadow-hawk-modal animate-hawk-sheet-up',
  'side-sheet':
    'h-full w-full max-w-xl bg-hawk-paper shadow-hawk-modal animate-hawk-sheet-right',
  takeover: 'h-full w-full bg-hawk-paper animate-hawk-content-in',
  popover:
    'w-full max-w-sm rounded-hawk-fixed-md bg-hawk-paper shadow-hawk-popover animate-hawk-content-in',
};

/**
 * The overlay host. Every Hawk overlay surface renders through this one
 * component; the surface chooses anchor and coverage and nothing else.
 */
export function HawkOverlay({
  open,
  onClose,
  surface = HawkOverlaySurface.MODAL,
  children,
  dismissible = true,
  container,
  label,
  className,
  frameClassName,
  elevated = false,
}: HawkOverlayProps) {
  const control = useMemo<HawkOverlayControl>(
    () => ({ open, setOpen: (next) => (next ? undefined : onClose()), close: onClose }),
    [open, onClose],
  );

  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const releaseScroll = lockScroll();
    const releaseEscape = dismissible ? pushEscape(onClose) : () => undefined;
    return () => {
      releaseScroll();
      releaseEscape();
    };
  }, [open, dismissible, onClose]);

  // Move focus into the panel on open. Without this the keyboard user stays
  // behind the scrim, tabbing through content they cannot see.
  useEffect(() => {
    if (!open) return;
    const node = panelRef.current;
    if (node) node.focus({ preventScroll: true });
  }, [open]);

  if (!open || typeof document === 'undefined') return null;
  const target = container ?? document.body;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 flex',
        elevated ? 'z-hawk-critical' : 'z-hawk-modal',
        SURFACE_FRAME[surface],
        frameClassName,
      )}
    >
      <div
        aria-hidden="true"
        onClick={dismissible ? onClose : undefined}
        className={cn(
          'hawk-motion absolute inset-0 animate-hawk-scrim-in bg-hawk-scrim',
          dismissible && 'cursor-pointer',
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={cn(
          'hawk-motion relative flex max-h-full flex-col outline-none',
          SURFACE_PANEL[surface],
          className,
        )}
      >
        <OverlayContext.Provider value={control}>{children}</OverlayContext.Provider>
      </div>
    </div>,
    target,
  );
}
