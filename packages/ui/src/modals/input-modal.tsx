import { useState } from 'react';

import { IconClose } from '@icons';


import { AppButton } from '../primitives/app-button/app-button.js';
import { AppText } from '../primitives/app-text/app-text.js';
import { AppTextAreaInput } from '../primitives/app-text-area-input/app-text-area-input.js';
import { AppTextInput } from '../primitives/app-text-input/app-text-input.js';

import type { InputModalOptions } from './types.js';

interface InputModalProps {
  title: string;
  message: string;
  options: InputModalOptions;
  onDismiss: () => void;
  isFullscreen: boolean;
}

export function InputModal({ title, message, options, onDismiss, isFullscreen }: InputModalProps) {
  const [value, setValue] = useState(options.defaultValue ?? '');
  const [error, setError] = useState<string | undefined>(undefined);

  const showClose = options.showCloseButton ?? true;
  const showCancel = options.showCancelButton ?? true;
  const confirmText = options.confirmButtonText ?? 'Save and proceed';
  const cancelText = options.cancelButtonText ?? 'Cancel';
  const stepLabel = options.stepLabel;
  const obscure = options.inputType === 'password';

  const handleConfirm = () => {
    if (options.pattern && !options.pattern.test(value)) {
      setError(options.errorMessage ?? 'Invalid input. Please try again.');
      return;
    }
    options.onConfirm?.(value);
    onDismiss();
  };

  const inputType =
    options.inputType === 'number'
      ? 'number'
      : options.inputType === 'email'
        ? 'email'
        : options.inputType === 'password'
          ? 'password'
          : 'text';

  const inputField = options.multiline ? (
    <AppTextAreaInput
      value={value}
      placeholder={options.placeholder}
      maxLength={options.maxLength}
      errorMessage={error}
      onChange={(v) => {
        setValue(v);
        setError(undefined);
      }}
    />
  ) : (
    <AppTextInput
      value={value}
      placeholder={options.placeholder}
      maxLength={options.maxLength}
      obscureText={obscure}
      inputType={inputType}
      errorMessage={error}
      startIcon={options.startIcon}
      endIcon={options.endIcon}
      autoFocus
      onChange={(v) => {
        setValue(v);
        setError(undefined);
      }}
      onSubmit={handleConfirm}
    />
  );

  if (isFullscreen) {
    return (
      <div className="relative flex h-full w-full flex-col bg-background">
        {showClose ? (
          <button
            type="button"
            onClick={() => {
              options.onCancel?.();
              onDismiss();
            }}
            aria-label="Close"
            className="absolute right-6 top-4 text-text-muted"
          >
            <IconClose size={24} />
          </button>
        ) : null}
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          {stepLabel ? (
            <AppText variant="label" align="center" color="var(--ohl-text-muted)">
              {stepLabel}
            </AppText>
          ) : null}
          <AppText as="h2" variant="bodyTitle" align="center" weight={700} className="mt-3">
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
          <div className="mt-7 w-full max-w-md px-2">{inputField}</div>
        </div>
        <div className="px-6 pb-6">
          <AppButton
            label={confirmText}
            expanded
            radius={100}
            isDisabled={value.length === 0}
            onPressed={handleConfirm}
          />
          {showCancel ? (
            <div className="mt-2.5">
              <AppButton
                label={cancelText}
                variant="outline"
                expanded
                radius={100}
                onPressed={() => {
                  options.onCancel?.();
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
      <div className="flex items-center">
        {stepLabel ? (
          <AppText variant="label" color="var(--ohl-text-muted)" align="start">
            {stepLabel}
          </AppText>
        ) : (
          <span className="flex-1" />
        )}
        <span className="flex-1" />
        {showClose ? (
          <button
            type="button"
            onClick={() => {
              options.onCancel?.();
              onDismiss();
            }}
            aria-label="Close"
            className="text-text-muted"
          >
            <IconClose size={22} />
          </button>
        ) : null}
      </div>
      <AppText as="h2" variant="bodyTitle" align="start" weight={700} className="mt-4">
        {title}
      </AppText>
      <AppText as="p" variant="body" color="var(--ohl-text-muted)" align="start" className="mt-1.5">
        {message}
      </AppText>
      <div className="mt-5">{inputField}</div>
      <div className="mt-6">
        <AppButton
          label={confirmText}
          expanded
          radius={100}
          isDisabled={value.length === 0}
          onPressed={handleConfirm}
        />
      </div>
      {showCancel ? (
        <div className="mt-2.5">
          <AppButton
            label={cancelText}
            variant="outline"
            expanded
            radius={100}
            onPressed={() => {
              options.onCancel?.();
              onDismiss();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
