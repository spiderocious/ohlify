import { useState, type ReactNode } from 'react';

import { HawkIconButton } from '../actions/icon-button.js';
import { HawkIcon } from '../foundation/icon.js';
import { HawkSkeleton, HawkSkeletonLine } from '../foundation/skeleton.js';
import { HawkText } from '../foundation/text.js';
import { IconAlertTriangle, IconCheck, IconPaperclip, IconSendPlane } from '../icons/index.js';
import { cn } from '../utils/cn.js';

export const HawkMessageStatus = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
} as const;
export type HawkMessageStatus = (typeof HawkMessageStatus)[keyof typeof HawkMessageStatus];

export interface HawkChatBubbleProps {
  message: ReactNode;
  /** Sent by the viewer, rather than received. */
  own?: boolean;
  timestamp?: string;
  status?: HawkMessageStatus;
  /** Author name — shown only on received messages in a group. */
  author?: string;
  /** Attachment preview above the text. */
  attachment?: ReactNode;
  onRetry?: () => void;
  className?: string;
}

/**
 * A chat bubble.
 *
 * The delivery status sits on the viewer's own messages only. On a received
 * message it would be meaningless — the sender's read receipt is not the
 * recipient's business — and rendering it there is a common mistake that leaks
 * the other party's state.
 */
export function HawkChatBubble({
  message,
  own = false,
  timestamp,
  status,
  author,
  attachment,
  onRetry,
  className,
}: HawkChatBubbleProps) {
  const failed = status === HawkMessageStatus.FAILED;

  return (
    <div
      className={cn(
        'flex w-full flex-col gap-hawk-1',
        own ? 'items-end' : 'items-start',
        className,
      )}
    >
      {author && !own && (
        <HawkText variant="caption" ink="muted" className="px-hawk-3">
          {author}
        </HawkText>
      )}

      <div
        className={cn(
          'max-w-[78%] rounded-hawk-fixed-md px-hawk-5 py-hawk-4',
          own
            ? 'rounded-br-hawk-xs bg-hawk-acc text-hawk-acc-on'
            : 'rounded-bl-hawk-xs bg-hawk-sunken text-hawk-ink',
          failed && 'border border-hawk-critical',
        )}
      >
        {attachment && (
          <div className="mb-hawk-3 overflow-hidden rounded-hawk-sm">{attachment}</div>
        )}
        <div className="whitespace-pre-wrap break-words text-hawk-body">{message}</div>
      </div>

      <div className="flex items-center gap-hawk-2 px-hawk-3">
        {timestamp && (
          <HawkText variant="tiny" ink="disabled" record>
            {timestamp}
          </HawkText>
        )}
        {own && status && <StatusTick status={status} />}
        {failed && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="hawk-focusable rounded-hawk-xs text-hawk-tiny font-semibold text-hawk-critical hover:underline"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

function StatusTick({ status }: { status: HawkMessageStatus }) {
  if (status === HawkMessageStatus.FAILED) {
    return (
      <HawkIcon icon={IconAlertTriangle} size={11} label="Failed" className="text-hawk-critical" />
    );
  }
  if (status === HawkMessageStatus.SENDING) {
    return (
      <span
        aria-label="Sending"
        className="hawk-motion inline-block h-2.5 w-2.5 animate-hawk-spin rounded-full border border-hawk-ink-disabled border-t-transparent"
      />
    );
  }
  // Sent, delivered and read share the tick and differ by count and tint — the
  // convention every messaging app has trained users on.
  const doubled = status === HawkMessageStatus.DELIVERED || status === HawkMessageStatus.READ;
  return (
    <span
      className={cn(
        'inline-flex',
        status === HawkMessageStatus.READ ? 'text-hawk-acc' : 'text-hawk-ink-disabled',
      )}
      aria-label={status}
    >
      <HawkIcon icon={IconCheck} size={11} />
      {doubled && <HawkIcon icon={IconCheck} size={11} className="-ml-1" />}
    </span>
  );
}

export function HawkChatBubbleSkeleton({ own = false }: { own?: boolean }) {
  return (
    <div className={cn('flex w-full', own ? 'justify-end' : 'justify-start')}>
      <div className="w-[60%] max-w-xs">
        <HawkSkeleton height={44} className="rounded-hawk-fixed-md" />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkChatComposerProps {
  value?: string;
  onChange?: (value: string) => void;
  onSend?: () => void;
  onAttach?: () => void;
  placeholder?: string;
  disabled?: boolean;
  /** Explains why sending is unavailable — a closed thread, a block. */
  disabledReason?: string;
  sending?: boolean;
  className?: string;
}

export function HawkChatComposer({
  value = '',
  onChange,
  onSend,
  onAttach,
  placeholder = 'Message',
  disabled = false,
  disabledReason,
  sending = false,
  className,
}: HawkChatComposerProps) {
  const canSend = value.trim().length > 0 && !disabled && !sending;

  if (disabled && disabledReason) {
    return (
      <div
        className={cn(
          'flex items-center justify-center border-t border-hawk-line bg-hawk-stock px-hawk-pad py-hawk-5',
          className,
        )}
      >
        <HawkText variant="caption" ink="muted" align="center">
          {disabledReason}
        </HawkText>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-end gap-hawk-4 border-t border-hawk-line bg-hawk-paper p-hawk-5',
        className,
      )}
    >
      {onAttach && (
        <HawkIconButton icon={IconPaperclip} label="Attach a file" size="md" onClick={onAttach} />
      )}

      <div className="flex max-h-32 min-h-[40px] flex-1 items-center rounded-hawk-fixed-xl border border-hawk-line bg-hawk-stock px-hawk-5 py-hawk-3">
        <textarea
          rows={1}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => onChange?.(event.target.value)}
          onKeyDown={(event) => {
            // Enter sends; Shift+Enter breaks the line. The reverse would make
            // every multi-line message an accident.
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              if (canSend) onSend?.();
            }
          }}
          className="w-full resize-none bg-transparent text-hawk-body text-hawk-ink outline-none placeholder:text-hawk-ink-disabled"
        />
      </div>

      <HawkIconButton
        icon={IconSendPlane}
        label="Send"
        variant="solid"
        shape="circle"
        size="md"
        disabled={!canSend}
        loading={sending}
        onClick={onSend}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

export interface HawkMediaProps {
  src: string;
  alt: string;
  /** Aspect ratio as width/height. Defaults to 16/9. */
  ratio?: number;
  /** Opens a lightbox on click. */
  lightbox?: boolean;
  className?: string;
}

/**
 * A media container.
 *
 * Reserves the aspect ratio before the image loads, so a feed of images does
 * not reflow line by line as they arrive — the single most disorienting thing a
 * scrolling list can do.
 */
export function HawkMedia({
  src,
  alt,
  ratio = 16 / 9,
  lightbox = false,
  className,
}: HawkMediaProps) {
  const [open, setOpen] = useState(false);
  // An absent src is a *placeholder*, not a failure — a document slot before
  // anything is uploaded, or a preview a caller has not resolved yet. Rendering
  // `<img src="">` makes browsers re-request the whole page, so the empty case
  // takes the same branch as a broken URL.
  const [failed, setFailed] = useState(false);
  const missing = !src || failed;

  return (
    <>
      <div
        className={cn('relative overflow-hidden rounded-hawk-sm bg-hawk-sunken', className)}
        style={{ aspectRatio: String(ratio) }}
      >
        {missing ? (
          <div className="flex h-full w-full items-center justify-center">
            <HawkText variant="caption" ink="disabled">
              {src ? 'Could not load image' : alt}
            </HawkText>
          </div>
        ) : (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onError={() => setFailed(true)}
            onClick={lightbox ? () => setOpen(true) : undefined}
            className={cn('h-full w-full object-cover', lightbox && 'cursor-zoom-in')}
          />
        )}
      </div>

      {open && !missing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-hawk-modal flex cursor-zoom-out items-center justify-center bg-hawk-scrim p-hawk-8"
        >
          <img src={src} alt={alt} className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </>
  );
}

export function HawkMediaSkeleton({ ratio = 16 / 9 }: { ratio?: number }) {
  return (
    <div style={{ aspectRatio: String(ratio) }} className="w-full">
      <HawkSkeleton className="h-full w-full rounded-hawk-sm" />
    </div>
  );
}

/** A row of thumbnails — a KYC document set, a chat's attachments. */
export function HawkMediaStrip({
  items,
  className,
}: {
  items: ReadonlyArray<{ id: string; src: string; alt: string }>;
  className?: string;
}) {
  return (
    <div className={cn('flex gap-hawk-3 overflow-x-auto pb-hawk-2', className)}>
      {items.map((item) => (
        <div key={item.id} className="w-28 shrink-0">
          <HawkMedia src={item.src} alt={item.alt} ratio={1} lightbox />
        </div>
      ))}
    </div>
  );
}

export { HawkSkeletonLine };
