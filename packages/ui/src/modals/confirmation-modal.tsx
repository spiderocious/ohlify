import { IconAlertTriangle, IconCheck, IconClose, IconHelpCircle, IconInfo } from '@icons';
import type { ReactNode } from 'react';


import { AppButton } from '../primitives/app-button/app-button.js';
import { AppText } from '../primitives/app-text/app-text.js';

import type { ConfirmationModalOptions, ModalConfirmationKind } from './types.js';

interface ConfirmationModalProps {
  title: string;
  message: string;
  options: ConfirmationModalOptions;
  onDismiss: () => void;
  isFullscreen: boolean;
}

const CIRCLE_BG: Record<ModalConfirmationKind, string> = {
  neutral: '#F3F4F6',
  success: '#DCFCE7',
  error: '#FEE2E2',
  warning: '#FFF7ED',
  info: '#EFF6FF',
};

const CIRCLE_BORDER: Record<ModalConfirmationKind, string> = {
  neutral: 'var(--ohl-border)',
  success: 'var(--ohl-success)',
  error: 'var(--ohl-error)',
  warning: 'var(--ohl-warning)',
  info: 'var(--ohl-primary)',
};

function IconCircle({ kind }: { kind: ModalConfirmationKind }) {
  const Icon =
    kind === 'neutral'
      ? IconHelpCircle
      : kind === 'success'
        ? IconCheck
        : kind === 'error'
          ? IconClose
          : kind === 'warning'
            ? IconAlertTriangle
            : IconInfo;
  return (
    <div
      style={{
        width: 80,
        height: 80,
        borderRadius: '50%',
        backgroundColor: CIRCLE_BG[kind],
        border: `3px solid ${CIRCLE_BORDER[kind]}`,
      }}
      className="flex items-center justify-center"
    >
      <Icon size={36} color={CIRCLE_BORDER[kind]} />
    </div>
  );
}

function DestructiveButton({
  label,
  isLoading,
  onPressed,
}: {
  label: string;
  isLoading: boolean;
  onPressed: () => void;
}) {
  return (
    <button
      type="button"
      disabled={isLoading}
      onClick={onPressed}
      style={{
        width: '100%',
        height: 52,
        borderRadius: 100,
        backgroundColor: 'var(--ohl-danger)',
        color: '#fff',
        fontFamily: 'var(--font-sans)',
        fontWeight: 600,
        fontSize: 16,
        opacity: isLoading ? 0.7 : 1,
        transition: 'opacity 150ms ease',
      }}
    >
      {isLoading ? (
        <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
      ) : (
        label
      )}
    </button>
  );
}

export function ConfirmationModal({
  title,
  message,
  options,
  onDismiss,
  isFullscreen,
}: ConfirmationModalProps) {
  const kind = options.kind ?? 'neutral';
  const showClose = options.showCloseButton ?? true;
  const showCancel = options.showCancelButton ?? true;
  const showIcon = options.showIcon ?? true;
  const destructive = options.destructive ?? false;
  const isLoading = options.isLoading ?? false;
  const confirmText = options.confirmButtonText ?? 'Confirm';
  const cancelText = options.cancelButtonText ?? 'Cancel';
  const icon: ReactNode | null = options.icon ?? (showIcon ? <IconCircle kind={kind} /> : null);

  const onConfirm = () => {
    options.onConfirm?.();
    if (!isLoading) onDismiss();
  };
  const onCancel = () => {
    options.onCancel?.();
    onDismiss();
  };

  const confirmButton = destructive ? (
    <DestructiveButton label={confirmText} isLoading={isLoading} onPressed={onConfirm} />
  ) : (
    <AppButton
      label={confirmText}
      expanded
      radius={100}
      isLoading={isLoading}
      onPressed={onConfirm}
    />
  );

  if (isFullscreen) {
    return (
      <div className="relative flex h-full w-full flex-col bg-background">
        {showClose ? (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="absolute right-6 top-4 text-text-muted"
          >
            <IconClose size={24} />
          </button>
        ) : null}
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          {icon}
          <AppText as="h2" variant="medium" align="center" weight={700} className="mt-6">
            {title}
          </AppText>
          <AppText
            as="p"
            variant="body"
            align="center"
            color="var(--ohl-text-muted)"
            className="mt-2.5"
          >
            {message}
          </AppText>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          {showCancel ? (
            <div className="flex-1">
              <AppButton
                label={cancelText}
                variant="outline"
                expanded
                radius={100}
                onPressed={onCancel}
              />
            </div>
          ) : null}
          <div className="flex-1">{confirmButton}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-[20px] bg-background px-6 pb-6 pt-7">
      {showClose ? (
        <div className="mb-1 flex justify-end">
          <button type="button" onClick={onCancel} aria-label="Close" className="text-text-muted">
            <IconClose size={22} />
          </button>
        </div>
      ) : null}
      <div className="flex flex-col items-center text-center">
        {icon}
        <AppText
          as="h2"
          variant="medium"
          align="center"
          weight={700}
          className={icon ? 'mt-5' : ''}
        >
          {title}
        </AppText>
        <AppText
          as="p"
          variant="body"
          align="center"
          color="var(--ohl-text-muted)"
          className="mt-2"
        >
          {message}
        </AppText>
      </div>
      <div className="mt-6">{confirmButton}</div>
      {showCancel ? (
        <div className="mt-2.5">
          <AppButton
            label={cancelText}
            variant="outline"
            expanded
            radius={100}
            onPressed={onCancel}
          />
        </div>
      ) : null}
    </div>
  );
}
