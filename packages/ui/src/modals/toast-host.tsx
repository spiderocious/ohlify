import { createPortal } from 'react-dom';

import { AppToast } from '../primitives/app-toast/app-toast.js';
import { cn } from '../utils/cn.js';

import { drawerStore } from './store.js';
import { useToasts } from './use-drawer-store.js';

interface ToastHostProps {
  container?: HTMLElement | null;
}

/**
 * Mounts once at app root. Renders all active toasts.
 * Mirrors mobile ToastOverlay.
 */
export function ToastHost({ container }: ToastHostProps = {}) {
  const toasts = useToasts();
  if (toasts.length === 0 || typeof document === 'undefined') return null;

  const target = container ?? document.body;

  const splitter = (pos: 'top' | 'bottom', full: boolean) =>
    toasts.filter((t) => t.options.position === pos && t.options.fullWidth === full);

  const topNormal = splitter('top', false);
  const topFull = splitter('top', true);
  const bottomNormal = splitter('bottom', false);
  const bottomFull = splitter('bottom', true);

  return createPortal(
    <>
      {topNormal.length > 0 ? (
        <ToastColumn
          toasts={topNormal}
          className="fixed left-4 right-4 top-4 z-[1100] flex flex-col gap-2"
          fromAbove
        />
      ) : null}
      {topFull.length > 0 ? (
        <ToastColumn
          toasts={topFull}
          className="fixed left-0 right-0 top-0 z-[1100] flex flex-col gap-2"
          fromAbove
          fullBleed
        />
      ) : null}
      {bottomNormal.length > 0 ? (
        <ToastColumn
          toasts={bottomNormal}
          className="fixed bottom-4 left-4 right-4 z-[1100] flex flex-col-reverse gap-2"
        />
      ) : null}
      {bottomFull.length > 0 ? (
        <ToastColumn
          toasts={bottomFull}
          className="fixed bottom-0 left-0 right-0 z-[1100] flex flex-col-reverse gap-2"
          fullBleed
        />
      ) : null}
    </>,
    target,
  );
}

interface ToastColumnProps {
  toasts: ReturnType<typeof useToasts>;
  className: string;
  fromAbove?: boolean;
  fullBleed?: boolean;
}

function ToastColumn({
  toasts,
  className,
  fromAbove = false,
  fullBleed = false,
}: ToastColumnProps) {
  return (
    <div className={className}>
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(fullBleed ? '' : 'mx-auto w-full max-w-2xl')}
          style={{
            animation: fromAbove
              ? 'ohlSlideDown 220ms cubic-bezier(0.22,1,0.36,1)'
              : 'ohlSlideUp 220ms cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          <AppToast
            type={t.options.type}
            message={t.message}
            fullWidth={t.options.fullWidth}
            showIcon={t.options.showIcon}
            icon={t.options.icon}
            dismissible={t.options.dismissible}
            onDismiss={() => drawerStore.dismissToast(t.id)}
          />
        </div>
      ))}
    </div>
  );
}
