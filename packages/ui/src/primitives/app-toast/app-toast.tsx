import type { ReactNode } from 'react';

import { IconCheckCircle, IconAlertCircle, IconInfo, IconAlertTriangle } from '@icons';


import { cn } from '../../utils/cn.js';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface AppToastProps {
  type?: ToastType;
  message: string;
  /** When true the bar is flush to the screen edge (no margin/radius). */
  fullWidth?: boolean;
  /** When false, no leading icon. */
  showIcon?: boolean;
  /** Override the leading icon. */
  icon?: ReactNode;
  /** Show the "Dismiss" tail label. */
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const BG: Record<ToastType, string> = {
  success: 'var(--ohl-toast-success-bg)',
  error: 'var(--ohl-toast-error-bg)',
  warning: 'var(--ohl-toast-warning-bg)',
  info: 'var(--ohl-toast-info-bg)',
};

const ICON_TINT: Record<ToastType, string> = {
  success: 'var(--ohl-toast-success-icon)',
  error: 'var(--ohl-toast-error-icon)',
  warning: 'var(--ohl-toast-warning-icon)',
  info: 'var(--ohl-toast-info-icon)',
};

/**
 * Mirrors mobile/lib/ui/widgets/app_toast/app_toast.dart.
 * Used both standalone (in component preview) and inside the toast overlay
 * driven by DrawerService.
 */
export function AppToast({
  type = 'success',
  message,
  fullWidth = false,
  showIcon = true,
  icon,
  dismissible = true,
  onDismiss,
  className,
}: AppToastProps) {
  const defaultIcon: Record<ToastType, ReactNode> = {
    success: <IconCheckCircle size={20} color={ICON_TINT[type]} />,
    error: <IconAlertCircle size={20} color={ICON_TINT[type]} />,
    warning: <IconAlertTriangle size={20} color={ICON_TINT[type]} />,
    info: <IconInfo size={20} color={ICON_TINT[type]} />,
  };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        backgroundColor: BG[type],
        borderRadius: fullWidth ? 0 : 10,
        padding: fullWidth ? '14px 20px' : '14px 16px',
      }}
      className={cn('flex w-full items-center font-sans text-white', className)}
    >
      {showIcon ? (
        <span className="mr-3 inline-flex items-center justify-center">
          {icon ?? defaultIcon[type]}
        </span>
      ) : null}
      <span className="flex-1 text-sm font-medium leading-[1.4] text-white">{message}</span>
      {dismissible ? (
        <button type="button" onClick={onDismiss} className="ml-3 text-sm font-bold text-white">
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
