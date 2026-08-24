import type { ReactNode } from 'react';

import type { HawkSemantic } from '../theme/semantic.js';

/**
 * Hawk's imperative overlay API.
 *
 * The v1 package established this shape (`DrawerService.toast(...)`,
 * `.showConfirmationModal(...)`) and it was right: feature code needs to raise
 * a modal from an event handler, a mutation's `onError`, a route guard — places
 * where rendering a `<Modal open={...}>` means threading state through
 * components that have no other reason to know about it. A module-level
 * singleton is what makes `await HawkDrawer.confirm(...)` possible.
 *
 * Two things differ from v1, both deliberate.
 *
 * **Every prompt returns a promise that resolves to the answer.** v1's
 * `showConfirmationModal` took an `onConfirm` callback and returned a handle;
 * the caller's logic then split across two places. Here:
 *
 * ```ts
 * if (await HawkDrawer.confirm({ title: 'Cancel this call?' })) {
 *   await cancelCall();
 * }
 * ```
 *
 * A dismissed prompt resolves `false` / `null` rather than rejecting — the user
 * closing a dialog is an answer, not an exception, and forcing every call site
 * into a try/catch to handle "they changed their mind" is how unhandled
 * rejections get shipped.
 *
 * **The two critical idioms are first-class.** `typedConfirm` and `delayedSend`
 * (CONTRACTS §4.1) are methods here rather than components a caller has to
 * remember to reach for. An irreversible action that is one keystroke away from
 * `confirm()` will eventually be written as `confirm()`.
 */

export interface HawkDrawerHandle {
  /** Close it from outside — a socket event, a route change. */
  dismiss: () => void;
  /** Resolves once the surface has actually closed. */
  onDismissed: Promise<void>;
}

export interface HawkFeedbackOptions {
  title: string;
  message?: string;
  semantic?: HawkSemantic;
  actionLabel?: string;
  /** Auto-close after this many ms. `0` waits for the user. */
  autoDismissMs?: number;
}

export interface HawkConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm button in the danger register. */
  destructive?: boolean;
}

export interface HawkTypedConfirmOptions extends HawkConfirmOptions {
  /** The literal word the user must type — `APPROVE`, `POST`, `BLOCK`. */
  phrase: string;
  /** What is about to happen, shown as evidence above the input. */
  summary?: ReactNode;
}

export interface HawkPromptOptions {
  title: string;
  message?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  multiline?: boolean;
  /** Return an error string to block submission, or `undefined` to allow it. */
  validate?: (value: string) => string | undefined;
}

export interface HawkDelayedSendOptions {
  title: string;
  message?: string;
  /** Seconds before it fires. PRD §5.2 specifies five minutes for campaigns. */
  delaySeconds?: number;
  summary?: ReactNode;
}

export interface HawkSheetOptions {
  title?: string;
  /** Which surface. All share the overlay contract; only coverage differs. */
  surface?: 'bottom-sheet' | 'side-sheet' | 'takeover' | 'modal';
  dismissible?: boolean;
}

export type HawkOverlayEntry =
  | {
      id: string;
      kind: 'feedback';
      options: HawkFeedbackOptions;
      resolve: (value: boolean) => void;
    }
  | {
      id: string;
      kind: 'confirm';
      options: HawkConfirmOptions;
      resolve: (value: boolean) => void;
    }
  | {
      id: string;
      kind: 'typed-confirm';
      options: HawkTypedConfirmOptions;
      resolve: (value: boolean) => void;
    }
  | {
      id: string;
      kind: 'prompt';
      options: HawkPromptOptions;
      resolve: (value: string | null) => void;
    }
  | {
      id: string;
      kind: 'delayed-send';
      options: HawkDelayedSendOptions;
      resolve: (value: boolean) => void;
    }
  | {
      id: string;
      kind: 'custom';
      options: HawkSheetOptions;
      render: (dismiss: () => void) => ReactNode;
      resolve: (value: boolean) => void;
    };

type Listener = (entries: readonly HawkOverlayEntry[]) => void;

class HawkDrawerStore {
  private entries: HawkOverlayEntry[] = [];
  private listeners = new Set<Listener>();
  private counter = 0;
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  snapshot(): readonly HawkOverlayEntry[] {
    return this.entries;
  }

  private emit(): void {
    const frozen = [...this.entries];
    this.listeners.forEach((listener) => listener(frozen));
  }

  private push(entry: HawkOverlayEntry): void {
    this.entries = [...this.entries, entry];
    this.emit();
  }

  private nextId(kind: string): string {
    this.counter += 1;
    return `hawk-${kind}-${this.counter}`;
  }

  /**
   * Settle and remove one entry.
   *
   * Resolving before removing matters: a caller awaiting the promise may
   * synchronously open the next surface, and doing it in the other order would
   * briefly leave both mounted.
   */
  private settle(id: string, value: boolean | string | null): void {
    const entry = this.entries.find((candidate) => candidate.id === id);
    if (!entry) return;

    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    if (entry.kind === 'prompt') {
      entry.resolve(typeof value === 'string' ? value : null);
    } else {
      entry.resolve(value === true);
    }

    this.entries = this.entries.filter((candidate) => candidate.id !== id);
    this.emit();
  }

  /** Called by the host when the user answers or dismisses. */
  resolveEntry(id: string, value: boolean | string | null): void {
    this.settle(id, value);
  }

  // ── Prompts ─────────────────────────────────────────────────────────────

  /** Tells the user what happened. Resolves when acknowledged. */
  feedback(options: HawkFeedbackOptions): Promise<boolean> {
    const id = this.nextId('feedback');
    return new Promise<boolean>((resolve) => {
      this.push({ id, kind: 'feedback', options, resolve });
      const ms = options.autoDismissMs ?? 0;
      if (ms > 0) {
        this.timers.set(
          id,
          setTimeout(() => this.settle(id, true), ms),
        );
      }
    });
  }

  /** Asks a yes/no question. Resolves `true` only on an explicit confirm. */
  confirm(options: HawkConfirmOptions): Promise<boolean> {
    const id = this.nextId('confirm');
    return new Promise<boolean>((resolve) => {
      this.push({ id, kind: 'confirm', options, resolve });
    });
  }

  /**
   * Typed confirmation — irreversible and immediate. CONTRACTS §4.1.
   *
   * For approving or rejecting a withdrawal, posting a manual journal, blocking
   * a user, rejecting KYC, deleting an account.
   */
  typedConfirm(options: HawkTypedConfirmOptions): Promise<boolean> {
    const id = this.nextId('typed');
    return new Promise<boolean>((resolve) => {
      this.push({ id, kind: 'typed-confirm', options, resolve });
    });
  }

  /**
   * Delayed send with a live cancel — irreversible once *sent*. CONTRACTS §4.1.
   *
   * Resolves `true` when the countdown completes, `false` if cancelled.
   */
  delayedSend(options: HawkDelayedSendOptions): Promise<boolean> {
    const id = this.nextId('delayed');
    return new Promise<boolean>((resolve) => {
      this.push({ id, kind: 'delayed-send', options, resolve });
    });
  }

  /** Collects one value. Resolves `null` if dismissed. */
  prompt(options: HawkPromptOptions): Promise<string | null> {
    const id = this.nextId('prompt');
    return new Promise<string | null>((resolve) => {
      this.push({ id, kind: 'prompt', options, resolve });
    });
  }

  /**
   * Opens arbitrary content in a Hawk surface.
   *
   * The render function receives its own `dismiss`, so the content can close
   * itself without the caller holding a handle.
   */
  open(
    render: (dismiss: () => void) => ReactNode,
    options: HawkSheetOptions = {},
  ): HawkDrawerHandle {
    const id = this.nextId('custom');
    let resolveDismissed!: () => void;
    const onDismissed = new Promise<void>((resolve) => {
      resolveDismissed = resolve;
    });

    this.push({
      id,
      kind: 'custom',
      options,
      render,
      resolve: () => resolveDismissed(),
    });

    return { dismiss: () => this.settle(id, false), onDismissed };
  }

  /** Convenience wrappers over `open`, matching the surface names. */
  bottomSheet(
    render: (dismiss: () => void) => ReactNode,
    options: Omit<HawkSheetOptions, 'surface'> = {},
  ): HawkDrawerHandle {
    return this.open(render, { ...options, surface: 'bottom-sheet' });
  }

  sideSheet(
    render: (dismiss: () => void) => ReactNode,
    options: Omit<HawkSheetOptions, 'surface'> = {},
  ): HawkDrawerHandle {
    return this.open(render, { ...options, surface: 'side-sheet' });
  }

  takeover(
    render: (dismiss: () => void) => ReactNode,
    options: Omit<HawkSheetOptions, 'surface'> = {},
  ): HawkDrawerHandle {
    return this.open(render, { ...options, surface: 'takeover' });
  }

  // ── Teardown ────────────────────────────────────────────────────────────

  /**
   * Close everything.
   *
   * Every pending promise still settles — to the negative answer. A caller
   * awaiting a confirm during a logout must not be left hanging on a promise
   * that can never resolve, and it must certainly not receive `true`.
   */
  dismissAll(): void {
    const open = [...this.entries];
    this.entries = [];
    this.timers.forEach((timer) => clearTimeout(timer));
    this.timers.clear();
    open.forEach((entry) => {
      if (entry.kind === 'prompt') entry.resolve(null);
      else entry.resolve(false);
    });
    this.emit();
  }
}

/**
 * The singleton. Mount `<HawkDrawerHost />` once inside a Hawk tree, then call
 * this from anywhere — including outside React.
 */
export const HawkDrawer = new HawkDrawerStore();
