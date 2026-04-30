import { IconClose } from '@icons';
import type { ReactNode } from 'react';


import { AppText } from '../primitives/app-text/app-text.js';
import { cn } from '../utils/cn.js';

import type { CustomModalOptions, ModalPosition } from './types.js';

interface CustomModalProps {
  title: string;
  options: CustomModalOptions;
  onDismiss: () => void;
  /** ModalHost passes the resolved position so the panel knows how to round itself. */
  position: ModalPosition;
  children: ReactNode;
}

/**
 * Mirrors mobile AppCustomModal: title bar + close + divider + body.
 * Radius adapts to the position so a bottom sheet rounds its top corners only,
 * a desktop right-drawer is square-edged on the inside, etc.
 */
export function CustomModal({ title, options, onDismiss, position, children }: CustomModalProps) {
  const showClose = options.showCloseButton ?? true;

  const shape = (() => {
    switch (position) {
      case 'fullscreen':
        return 'rounded-none';
      case 'bottom':
        // Mobile sheet: round top corners. Desktop right-drawer: round left corners.
        return 'rounded-t-[20px] lg:rounded-t-none lg:rounded-l-[20px]';
      case 'top':
        return 'rounded-b-[20px]';
      case 'center':
      default:
        return 'rounded-[20px]';
    }
  })();

  // At desktop, bottom-position becomes a right-drawer that fills viewport height.
  // At mobile, bottom-position is a sheet that hugs its content from the bottom.
  const sizing = position === 'fullscreen' ? 'h-full' : position === 'bottom' ? 'lg:h-full' : '';

  return (
    <div className={cn('flex w-full flex-col overflow-hidden bg-background', shape, sizing)}>
      <div className="flex items-center px-5 py-4">
        <div className="flex-1 truncate">
          <AppText variant="medium" color="var(--ohl-text-jet)" weight={700} align="start">
            {title}
          </AppText>
        </div>
        {showClose ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-surface-light text-text-jet"
          >
            <IconClose size={18} />
          </button>
        ) : null}
      </div>
      <div className="h-px w-full bg-border" />
      <div className="flex-1 overflow-y-auto p-5">{children}</div>
    </div>
  );
}
