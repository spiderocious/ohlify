import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '../utils/cn.js';

import { ConfirmationModal } from './confirmation-modal.js';
import { CustomModal } from './custom-modal.js';
import { FeedbackModal } from './feedback-modal.js';
import { InputModal } from './input-modal.js';
import { drawerStore } from './store.js';
import type { ModalEntry, ModalPosition } from './types.js';
import { useModals } from './use-drawer-store.js';

interface ModalHostProps {
  /** Render target. Defaults to document.body. */
  container?: HTMLElement | null;
}

/**
 * Mounts once at the app root. Renders any active modals as a portal stacked
 * over the page. Mirrors mobile/lib/ui/widgets/modal_overlay/modal_overlay.dart.
 *
 * Layout responsibility split:
 *   - This file owns the outer scrim + framing (where the panel goes on screen).
 *   - Each modal kind (Feedback / Confirmation / Input / Custom) owns its
 *     panel appearance — the host wraps it in a sized box keyed by ModalPosition.
 */
export function ModalHost({ container }: ModalHostProps = {}) {
  const modals = useModals();
  if (modals.length === 0 || typeof document === 'undefined') return null;
  const target = container ?? document.body;

  return createPortal(
    <div className="ohl-modal-stack" aria-live="polite">
      {modals.map((entry) => (
        <ModalLayer key={entry.id} entry={entry} />
      ))}
    </div>,
    target,
  );
}

function positionOf(entry: ModalEntry): ModalPosition {
  return entry.options.position ?? 'center';
}
function dismissibleOf(entry: ModalEntry): boolean {
  return entry.options.dismissible ?? true;
}
function barrierColorOf(entry: ModalEntry): string {
  return entry.options.barrierColor ?? 'rgb(0 0 0 / 0.55)';
}

function ModalLayer({ entry }: { entry: ModalEntry }) {
  const position = positionOf(entry);
  const dismissible = dismissibleOf(entry);
  const isFullscreen = position === 'fullscreen';
  const onDismiss = () => drawerStore.dismissModal(entry.id);

  // Lock scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // ESC closes top modal.
  useEffect(() => {
    if (!dismissible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') drawerStore.dismissModal(entry.id);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dismissible, entry.id]);

  const renderBody = () => {
    if (entry.kind === 'feedback') {
      return (
        <FeedbackModal
          title={entry.title}
          message={entry.message}
          options={entry.options}
          onDismiss={onDismiss}
          isFullscreen={isFullscreen}
        />
      );
    }
    if (entry.kind === 'confirmation') {
      return (
        <ConfirmationModal
          title={entry.title}
          message={entry.message}
          options={entry.options}
          onDismiss={onDismiss}
          isFullscreen={isFullscreen}
        />
      );
    }
    if (entry.kind === 'input') {
      return (
        <InputModal
          title={entry.title}
          message={entry.message}
          options={entry.options}
          onDismiss={onDismiss}
          isFullscreen={isFullscreen}
        />
      );
    }
    return (
      <CustomModal
        title={entry.title}
        options={entry.options}
        onDismiss={onDismiss}
        position={position}
      >
        {entry.render(onDismiss)}
      </CustomModal>
    );
  };

  // Outer scrim alignment.
  const scrimAlign = (() => {
    switch (position) {
      case 'top':
        return 'items-start justify-center pt-6';
      case 'bottom':
        // Mobile: flush to bottom edge. Desktop: stretch to right side.
        return 'items-end justify-center lg:items-stretch lg:justify-end';
      case 'fullscreen':
        return 'items-stretch justify-stretch';
      case 'center':
      default:
        return 'items-center justify-center p-4';
    }
  })();

  // Inner frame size.
  const frameBox = (() => {
    switch (position) {
      case 'top':
        return 'w-full max-w-md mx-4';
      case 'bottom':
        return 'w-full lg:h-full lg:max-w-md';
      case 'fullscreen':
        return 'h-full w-full';
      case 'center':
      default:
        return 'w-full max-w-md';
    }
  })();

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        backgroundColor: barrierColorOf(entry),
        animation: 'ohlFade 180ms ease-out',
      }}
      onClick={(e) => {
        if (!dismissible) return;
        if (e.target === e.currentTarget) onDismiss();
      }}
      className={cn('fixed inset-0 z-[1000] flex', scrimAlign)}
    >
      <div
        className={cn('pointer-events-auto relative', frameBox)}
        style={{ animation: animationFor(position) }}
        onClick={(e) => e.stopPropagation()}
      >
        {renderBody()}
      </div>
    </div>
  );
}

function animationFor(position: ModalPosition): string {
  switch (position) {
    case 'top':
      return 'ohlSlideDown 220ms cubic-bezier(0.22,1,0.36,1)';
    case 'bottom':
      return 'ohlSlideUp 220ms cubic-bezier(0.22,1,0.36,1)';
    case 'fullscreen':
      return 'ohlSlideUpFull 240ms cubic-bezier(0.22,1,0.36,1)';
    case 'center':
    default:
      return 'ohlPopIn 220ms cubic-bezier(0.22,1,0.36,1)';
  }
}
