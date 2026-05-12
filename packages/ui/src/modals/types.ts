import type { ReactNode } from 'react';

export type ModalPosition = 'center' | 'top' | 'bottom' | 'fullscreen';
export type ModalFeedbackKind = 'success' | 'error' | 'warning' | 'info';
export type ModalConfirmationKind = 'neutral' | 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top' | 'bottom';
export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type InputModalInputType = 'text' | 'number' | 'email' | 'password';

export interface FeedbackModalOptions {
  kind?: ModalFeedbackKind;
  position?: ModalPosition;
  dismissible?: boolean;
  showCloseButton?: boolean;
  autoDismiss?: boolean;
  /** ms */
  autoDismissDuration?: number;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  onConfirm?: () => void;
  confirmButtonText?: string;
  barrierColor?: string;
}

export interface ConfirmationModalOptions {
  kind?: ModalConfirmationKind;
  confirmButtonText?: string;
  cancelButtonText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  position?: ModalPosition;
  dismissible?: boolean;
  showCloseButton?: boolean;
  showCancelButton?: boolean;
  showIcon?: boolean;
  icon?: ReactNode;
  destructive?: boolean;
  barrierColor?: string;
  isLoading?: boolean;
}

export interface InputModalOptions {
  placeholder?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  onConfirm?: (value: string) => void;
  onCancel?: () => void;
  inputType?: InputModalInputType;
  pattern?: RegExp;
  errorMessage?: string;
  maxLength?: number;
  defaultValue?: string;
  multiline?: boolean;
  position?: ModalPosition;
  dismissible?: boolean;
  showCloseButton?: boolean;
  showCancelButton?: boolean;
  stepLabel?: string;
  barrierColor?: string;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
}

export interface CustomModalOptions {
  position?: ModalPosition;
  dismissible?: boolean;
  showCloseButton?: boolean;
  barrierColor?: string;
}

export interface ToastOptions {
  type?: ToastType;
  position?: ToastPosition;
  /** ms */
  duration?: number;
  dismissible?: boolean;
  showIcon?: boolean;
  icon?: ReactNode;
  sticky?: boolean;
  fullWidth?: boolean;
}

export interface DrawerHandle {
  dismiss: () => void;
  /** Resolves when the modal/toast finishes its dismiss animation. */
  onDismissed: Promise<void>;
}

export type ModalEntry =
  | {
      id: string;
      kind: 'feedback';
      title: string;
      message: string;
      options: FeedbackModalOptions;
    }
  | {
      id: string;
      kind: 'confirmation';
      title: string;
      message: string;
      options: ConfirmationModalOptions;
    }
  | {
      id: string;
      kind: 'input';
      title: string;
      message: string;
      options: InputModalOptions;
    }
  | {
      id: string;
      kind: 'custom';
      title: string;
      render: (onDismiss: () => void) => ReactNode;
      options: CustomModalOptions;
    };

export interface ToastEntry {
  id: string;
  message: string;
  options: Required<Omit<ToastOptions, 'icon'>> & { icon?: ReactNode };
}
