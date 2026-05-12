import { IconChevronRight } from '@icons';

import { cn } from '../../utils/cn.js';

interface ScreenContinueBarProps {
  onPressed?: () => void;
  label?: string;
  className?: string;
}

/**
 * Mirrors mobile/lib/ui/widgets/screen_continue_bar/screen_continue_bar.dart.
 * Sticky bottom bar — primary bg, white label left, white circle arrow right.
 * Dims to 50% when onPressed is null.
 */
export function ScreenContinueBar({
  onPressed,
  label = 'Continue',
  className,
}: ScreenContinueBarProps) {
  const enabled = Boolean(onPressed);
  return (
    <button
      type="button"
      onClick={onPressed}
      disabled={!enabled}
      style={{
        backgroundColor: enabled ? 'var(--ohl-primary)' : 'rgb(74 63 229 / 0.5)',
        transition: 'background-color 150ms ease',
      }}
      className={cn(
        'flex w-full items-center px-6 py-[18px] font-sans',
        'pb-[calc(18px+env(safe-area-inset-bottom))]',
        enabled ? 'cursor-pointer' : 'cursor-not-allowed',
        className,
      )}
    >
      <span className="text-base font-semibold text-white">{label}</span>
      <span className="flex-1" />
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white">
        <IconChevronRight size={20} color="var(--ohl-primary)" />
      </span>
    </button>
  );
}
