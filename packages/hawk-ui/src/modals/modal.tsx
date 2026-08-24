import { useEffect, useState, type ReactNode } from 'react';

import { HawkButton } from '../actions/button.js';
import { HawkIconButton } from '../actions/icon-button.js';
import {
  HawkOverlay,
  HawkOverlaySurface,
  type HawkOverlayProps,
} from '../contracts/overlay.js';
import { HawkIcon } from '../foundation/icon.js';
import { HawkText } from '../foundation/text.js';
import { HawkTextInput } from '../inputs/text-input.js';
import {
  IconAlertTriangle,
  IconCheck,
  IconClose,
  IconInfo,
} from '../icons/index.js';
import type { HawkIconComponent } from '../icons/index.js';
import { HawkSemantic, quartet } from '../theme/semantic.js';
import { cn } from '../utils/cn.js';
import { HawkCountdown } from '../feedback/states.js';

/**
 * The four modal primitives, plus the two critical idioms.
 *
 * All of them render through `HawkOverlay` (CONTRACTS §4), so open/close,
 * scrim timing, scroll locking, Escape handling and focus all behave
 * identically. Surfaces differ only in anchor and coverage.
 */

export interface HawkModalProps extends Omit<HawkOverlayProps, 'children' | 'label'> {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** The action row. */
  footer?: ReactNode;
  showClose?: boolean;
  icon?: HawkIconComponent;
  semantic?: HawkSemantic;
}

/** The base modal shell — header, scrollable body, pinned footer. */
export function HawkModal({
  title,
  description,
  children,
  footer,
  showClose = true,
  icon,
  semantic,
  onClose,
  ...overlay
}: HawkModalProps) {
  const tone = semantic ? quartet(semantic) : undefined;

  return (
    <HawkOverlay
      onClose={onClose}
      label={typeof title === 'string' ? title : undefined}
      {...overlay}
    >
      <div className="flex items-start gap-hawk-4 p-hawk-pad pb-hawk-4">
        {icon && tone && (
          <span
            className={cn(
              'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
              tone.softBg,
              tone.text,
            )}
          >
            <HawkIcon icon={icon} size={20} />
          </span>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-hawk-2">
          <HawkText variant="medium" ink="strong" as="h2">
            {title}
          </HawkText>
          {description && (
            <HawkText variant="body" ink="muted">
              {description}
            </HawkText>
          )}
        </div>
        {showClose && (
          <HawkIconButton icon={IconClose} label="Close" size="sm" onClick={onClose} />
        )}
      </div>

      {children && <div className="min-h-0 flex-1 overflow-y-auto px-hawk-pad">{children}</div>}

      {footer && (
        <div className="flex items-center justify-end gap-hawk-4 p-hawk-pad pt-hawk-6">
          {footer}
        </div>
      )}
    </HawkOverlay>
  );
}

/* ── 1 · Feedback ─────────────────────────────────────────────────────────── */

const SEMANTIC_ICON: Record<HawkSemantic, HawkIconComponent> = {
  neutral: IconInfo,
  info: IconInfo,
  success: IconCheck,
  caution: IconAlertTriangle,
  critical: IconAlertTriangle,
};

export interface HawkFeedbackModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  message?: ReactNode;
  semantic?: HawkSemantic;
  actionLabel?: string;
  onAction?: () => void;
}

/** Tells the user what happened. One dismissal, no decision. */
export function HawkFeedbackModal({
  open,
  onClose,
  title,
  message,
  semantic = HawkSemantic.SUCCESS,
  actionLabel = 'Done',
  onAction,
}: HawkFeedbackModalProps) {
  return (
    <HawkModal
      open={open}
      onClose={onClose}
      title={title}
      description={message}
      icon={SEMANTIC_ICON[semantic]}
      semantic={semantic}
      showClose={false}
      footer={
        <HawkButton
          label={actionLabel}
          block
          onClick={() => {
            onAction?.();
            onClose();
          }}
        />
      }
    />
  );
}

/* ── 2 · Confirmation ─────────────────────────────────────────────────────── */

export interface HawkConfirmModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  /** Irreversible — renders the confirm button in the danger register. */
  destructive?: boolean;
  loading?: boolean;
}

/** Asks a yes/no question. Reversible actions only — see the typed confirm. */
export function HawkConfirmModal({
  open,
  onClose,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  destructive = false,
  loading = false,
}: HawkConfirmModalProps) {
  return (
    <HawkModal
      open={open}
      onClose={onClose}
      title={title}
      description={message}
      icon={destructive ? IconAlertTriangle : IconInfo}
      semantic={destructive ? HawkSemantic.CRITICAL : HawkSemantic.INFO}
      footer={
        <>
          <HawkButton label={cancelLabel} variant="ghost" onClick={onClose} />
          <HawkButton
            label={confirmLabel}
            destructive={destructive}
            loading={loading}
            onClick={onConfirm}
          />
        </>
      }
    />
  );
}

/* ── 3 · Form ─────────────────────────────────────────────────────────────── */

export interface HawkFormModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  submitLabel?: string;
  cancelLabel?: string;
  onSubmit: () => void;
  submitting?: boolean;
  /** Blocks submission — a failed validation upstream. */
  submitDisabled?: boolean;
}

/** Collects input. The body scrolls; the actions stay pinned. */
export function HawkFormModal({
  open,
  onClose,
  title,
  description,
  children,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  onSubmit,
  submitting = false,
  submitDisabled = false,
}: HawkFormModalProps) {
  return (
    <HawkModal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <HawkButton label={cancelLabel} variant="ghost" onClick={onClose} />
          <HawkButton
            label={submitLabel}
            loading={submitting}
            disabled={submitDisabled}
            onClick={onSubmit}
          />
        </>
      }
    >
      <div className="flex flex-col gap-hawk-5 pb-hawk-2">{children}</div>
    </HawkModal>
  );
}

/* ── 4 · Typed confirm — the first critical idiom (CONTRACTS §4.1) ────────── */

export interface HawkTypedConfirmModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  message?: ReactNode;
  /** The literal word the user must type — `APPROVE`, `POST`, `BLOCK`. */
  phrase: string;
  confirmLabel?: string;
  onConfirm: () => void;
  loading?: boolean;
  /** What is about to happen, shown as evidence above the input. */
  summary?: ReactNode;
}

/**
 * Typed confirmation — irreversible and immediate.
 *
 * For approving or rejecting a withdrawal, posting a manual journal, blocking a
 * user, rejecting KYC, deleting an account. **The button stays disabled until
 * the typed text matches the phrase exactly.**
 *
 * The point is not friction for its own sake. It is that a misclick and a
 * deliberate decision should not be the same gesture, and for an action that
 * moves money out of a ledger irreversibly, they must not be.
 *
 * The match is case-sensitive and exact — a lowercase `approve` does not pass.
 * Accepting a near-miss would defeat the mechanism.
 */
export function HawkTypedConfirmModal({
  open,
  onClose,
  title,
  message,
  phrase,
  confirmLabel = 'Confirm',
  onConfirm,
  loading = false,
  summary,
}: HawkTypedConfirmModalProps) {
  const [typed, setTyped] = useState('');
  const matches = typed === phrase;

  // Clear on close, so reopening never arrives pre-armed from a prior attempt.
  useEffect(() => {
    if (!open) setTyped('');
  }, [open]);

  return (
    <HawkModal
      open={open}
      onClose={onClose}
      title={title}
      description={message}
      icon={IconAlertTriangle}
      semantic={HawkSemantic.CRITICAL}
      elevated
      footer={
        <>
          <HawkButton label="Cancel" variant="ghost" onClick={onClose} />
          <HawkButton
            label={confirmLabel}
            destructive
            disabled={!matches}
            loading={loading}
            onClick={onConfirm}
          />
        </>
      }
    >
      <div className="flex flex-col gap-hawk-5 pb-hawk-2">
        {summary && (
          <div className="rounded-hawk-sm bg-hawk-stock p-hawk-5">{summary}</div>
        )}
        <HawkTextInput
          label={`Type ${phrase} to confirm`}
          value={typed}
          onChange={setTyped}
          placeholder={phrase}
          autoComplete="off"
        />
      </div>
    </HawkModal>
  );
}

/* ── 5 · Delayed send — the second critical idiom (CONTRACTS §4.1) ────────── */

export interface HawkDelayedSendModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  message?: ReactNode;
  /** Seconds before the action fires. PRD §5.2 specifies five minutes. */
  delaySeconds?: number;
  onSend: () => void;
  onCancel?: () => void;
  summary?: ReactNode;
}

/**
 * Delayed send with a live cancel — irreversible and *unrecallable once sent*.
 *
 * For campaigns. A typed confirm is the wrong tool here: the danger is not that
 * the operator did not mean to press it, but that they will realise the copy
 * was wrong ninety seconds later. So the action commits immediately from the
 * operator's point of view and stays cancellable for the countdown.
 */
export function HawkDelayedSendModal({
  open,
  onClose,
  title,
  message,
  delaySeconds = 300,
  onSend,
  onCancel,
  summary,
}: HawkDelayedSendModalProps) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!open) setArmed(false);
  }, [open]);

  return (
    <HawkModal
      open={open}
      onClose={armed ? () => undefined : onClose}
      title={title}
      description={message}
      showClose={!armed}
      icon={IconAlertTriangle}
      semantic={HawkSemantic.CAUTION}
      footer={
        armed ? (
          <HawkButton
            label="Cancel send"
            variant="outline"
            destructive
            block
            onClick={() => {
              setArmed(false);
              onCancel?.();
              onClose();
            }}
          />
        ) : (
          <>
            <HawkButton label="Cancel" variant="ghost" onClick={onClose} />
            <HawkButton label="Schedule send" onClick={() => setArmed(true)} />
          </>
        )
      }
    >
      <div className="flex flex-col gap-hawk-5 pb-hawk-2">
        {summary && <div className="rounded-hawk-sm bg-hawk-stock p-hawk-5">{summary}</div>}
        {armed && (
          <div className="flex flex-col items-center gap-hawk-3 rounded-hawk-sm bg-hawk-caution-soft p-hawk-6">
            <HawkText variant="caption" className="text-hawk-caution-on-soft">
              Sending in
            </HawkText>
            <HawkCountdown
              seconds={delaySeconds}
              hazardBelow={30}
              onComplete={() => {
                onSend();
                onClose();
              }}
            />
            <HawkText variant="caption" className="text-hawk-caution-on-soft">
              You can still cancel until this reaches zero.
            </HawkText>
          </div>
        )}
      </div>
    </HawkModal>
  );
}

/* ── Sheets — the same contract, different coverage ───────────────────────── */

export interface HawkSheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  showClose?: boolean;
  className?: string;
}

/** A bottom sheet — the mobile-native surface for a short decision. */
export function HawkBottomSheet({
  open,
  onClose,
  title,
  children,
  footer,
  showClose = true,
  className,
}: HawkSheetProps) {
  return (
    <HawkOverlay
      open={open}
      onClose={onClose}
      surface={HawkOverlaySurface.BOTTOM_SHEET}
      label={typeof title === 'string' ? title : undefined}
      className={className}
    >
      <div className="flex justify-center pt-hawk-4">
        <span aria-hidden="true" className="h-1 w-10 rounded-full bg-hawk-line-strong" />
      </div>
      {title && (
        <div className="flex items-center gap-hawk-4 p-hawk-pad pb-hawk-4">
          <HawkText variant="medium" ink="strong" as="h2" className="flex-1">
            {title}
          </HawkText>
          {showClose && (
            <HawkIconButton icon={IconClose} label="Close" size="sm" onClick={onClose} />
          )}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-hawk-pad pb-hawk-pad">{children}</div>
      {footer && <div className="border-t border-hawk-line p-hawk-pad">{footer}</div>}
    </HawkOverlay>
  );
}

/** A side sheet — the operator's detail panel. */
export function HawkSideSheet({
  open,
  onClose,
  title,
  children,
  footer,
  showClose = true,
  className,
}: HawkSheetProps) {
  return (
    <HawkOverlay
      open={open}
      onClose={onClose}
      surface={HawkOverlaySurface.SIDE_SHEET}
      label={typeof title === 'string' ? title : undefined}
      className={className}
    >
      {title && (
        <div className="flex items-center gap-hawk-4 border-b border-hawk-line p-hawk-pad">
          <HawkText variant="medium" ink="strong" as="h2" className="flex-1">
            {title}
          </HawkText>
          {showClose && (
            <HawkIconButton icon={IconClose} label="Close" size="sm" onClick={onClose} />
          )}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto p-hawk-pad">{children}</div>
      {footer && <div className="border-t border-hawk-line p-hawk-pad">{footer}</div>}
    </HawkOverlay>
  );
}

/** A full-screen takeover — onboarding, the success moment, the call. */
export function HawkTakeover({
  open,
  onClose,
  title,
  children,
  footer,
  showClose = true,
  className,
}: HawkSheetProps) {
  return (
    <HawkOverlay
      open={open}
      onClose={onClose}
      surface={HawkOverlaySurface.TAKEOVER}
      label={typeof title === 'string' ? title : undefined}
      className={className}
    >
      {(title || showClose) && (
        <div className="flex items-center gap-hawk-4 p-hawk-pad">
          {title && (
            <HawkText variant="medium" ink="strong" as="h2" className="flex-1">
              {title}
            </HawkText>
          )}
          {showClose && (
            <HawkIconButton icon={IconClose} label="Close" size="md" onClick={onClose} />
          )}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      {footer && <div className="border-t border-hawk-line p-hawk-pad">{footer}</div>}
    </HawkOverlay>
  );
}
