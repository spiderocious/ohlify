import { IconAlertTriangle, IconCheck, IconClose, IconInfo } from '@icons';

import { AppButton } from '../primitives/app-button/app-button.js';
import { AppText } from '../primitives/app-text/app-text.js';

import type { ModalFeedbackKind, FeedbackModalOptions } from './types.js';

interface FeedbackModalProps {
  title: string;
  message: string;
  options: FeedbackModalOptions;
  onDismiss: () => void;
  isFullscreen: boolean;
}

const CIRCLE_BG: Record<ModalFeedbackKind, string> = {
  success: '#DCFCE7',
  error: '#FEE2E2',
  warning: '#FFF7ED',
  info: '#EFF6FF',
};

const CIRCLE_BORDER: Record<ModalFeedbackKind, string> = {
  success: 'var(--ohl-success)',
  error: 'var(--ohl-error)',
  warning: 'var(--ohl-warning)',
  info: 'var(--ohl-primary)',
};

function IconCircle({ kind }: { kind: ModalFeedbackKind }) {
  const Icon =
    kind === 'success'
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

export function FeedbackModal({
  title,
  message,
  options,
  onDismiss,
  isFullscreen,
}: FeedbackModalProps) {
  const kind = options.kind ?? 'success';
  const showClose = options.showCloseButton ?? true;
  const confirmText = options.confirmButtonText ?? 'Done';
  const icon = options.icon ?? <IconCircle kind={kind} />;

  if (isFullscreen) {
    return (
      <div className="relative flex h-full w-full flex-col bg-background">
        {showClose ? (
          <button
            type="button"
            onClick={onDismiss}
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
        <div className="px-6 pb-6">
          <AppButton
            label={confirmText}
            expanded
            radius={100}
            onPressed={() => {
              options.onConfirm?.();
              onDismiss();
            }}
          />
          {options.actionLabel ? (
            <div className="mt-2.5">
              <AppButton
                label={options.actionLabel}
                variant="plain"
                expanded
                radius={100}
                onPressed={() => {
                  options.onAction?.();
                  onDismiss();
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-[20px] bg-background px-6 pb-6 pt-7">
      {showClose ? (
        <div className="mb-1 flex justify-end">
          <button type="button" onClick={onDismiss} aria-label="Close" className="text-text-muted">
            <IconClose size={22} />
          </button>
        </div>
      ) : null}
      <div className="flex flex-col items-center text-center">
        {icon}
        <AppText as="h2" variant="medium" align="center" weight={700} className="mt-5">
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
      <div className="mt-6">
        <AppButton
          label={confirmText}
          expanded
          radius={100}
          onPressed={() => {
            options.onConfirm?.();
            onDismiss();
          }}
        />
        {options.actionLabel ? (
          <div className="mt-2.5">
            <AppButton
              label={options.actionLabel}
              variant="plain"
              expanded
              radius={100}
              onPressed={() => {
                options.onAction?.();
                onDismiss();
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
