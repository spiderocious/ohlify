import { useEffect } from 'react';

import { AppText, cn } from '@ohlify/ui';
import { IconClose } from '@icons';

interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Width in px. Default 480. */
  width?: number;
  /** Footer slot (typically primary action buttons). */
  footer?: React.ReactNode;
}

/**
 * Right-side sliding panel. Used for detail views and edit forms. Doesn't
 * use DrawerService because we want it tied to `?id=...` URL state via
 * the parent screen, not stacked on the imperative modal queue.
 *
 * Closes on Escape; the backdrop click is also wired.
 */
export function DetailDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = 480,
  footer,
}: DetailDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 transition-opacity',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-drawer-title"
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex flex-col bg-surface shadow-xl transition-transform duration-200',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        // Cap width to viewport-minus-gutter so the drawer never blows out a
        // small phone screen. Desktop still gets the requested width.
        style={{ width: `min(${width}px, calc(100vw - 24px))` }}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <AppText
              as="h2"
              variant="bodyTitle"
              className="text-base font-bold text-text-primary"
              {...{ id: 'detail-drawer-title' }}
            >
              {title}
            </AppText>
            {subtitle && (
              <AppText variant="bodySmall" className="mt-0.5 text-text-muted">
                {subtitle}
              </AppText>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-text-muted hover:text-text-primary"
          >
            <IconClose size={16} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-surface-light px-4 py-3 sm:px-5">
            {footer}
          </footer>
        )}
      </aside>
    </>
  );
}
